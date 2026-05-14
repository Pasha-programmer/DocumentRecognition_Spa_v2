import { Fragment, useEffect, useState } from 'react';
import { IRecognizedDocumentDto } from '../Interfaces/IRecognizedDocumentDto';

interface Props {
    data: IRecognizedDocumentDto[];
    title: string;
    actions?: (documentId: number) => JSX.Element;
    tableActions?: JSX.Element;
}

function base64ToBlob(base64String: string, mimeType = 'image/jpeg'): Blob {
    const byteCharacters = atob(base64String);
    const byteNumbers = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    return new Blob([byteNumbers], { type: mimeType });
}

function dataURLtoBlob(dataURL: string): Blob {
    const [header, base64Data] = dataURL.split(',');
    const mime = (header.match(/:(.*?);/) || [])[1] || 'image/jpeg';
    return base64ToBlob(base64Data, mime);
}

type SortKey = 'fileName' | 'label' | 'modelType' | 'probability';
type SortDir = 'asc' | 'desc' | 'none';

function nextDir(current: SortDir): SortDir {
    if (current === 'none') return 'asc';
    if (current === 'asc') return 'desc';
    return 'none';
}

function SortIcon({ dir }: { dir: SortDir }) {
    if (dir === 'none') return <span style={{ opacity: 0.25, fontSize: '0.7rem', marginLeft: 4 }}>⇅</span>;
    if (dir === 'asc')  return <span style={{ opacity: 0.8,  fontSize: '0.7rem', marginLeft: 4 }}>↑</span>;
    return                      <span style={{ opacity: 0.8,  fontSize: '0.7rem', marginLeft: 4 }}>↓</span>;
}


export default function DocumentTable({ data, title, actions, tableActions}: Props) {
    const [imageUrls, setImageUrls] = useState<Map<number, string>>(new Map());
    const [sortKey, setSortKey] = useState<SortKey | null>(null);
    const [sortDir, setSortDir] = useState<SortDir>('none');

    useEffect(() => {
        if (!data) return;
        const urls = new Map<number, string>();

        data.forEach(doc => {
            if (!doc.fileBlob) return;
            try {
                let blob: Blob;
                if (typeof doc.fileBlob === 'string') {
                    blob = doc.fileBlob.startsWith('data:')
                        ? dataURLtoBlob(doc.fileBlob)
                        : base64ToBlob(doc.fileBlob, doc.fileBlob.startsWith('iVBOR') ? 'image/png' : 'image/jpeg');
                } else {
                    blob = doc.fileBlob;
                }
                urls.set(doc.documentId, URL.createObjectURL(blob));
            } catch (e) {
                console.error('Error creating blob URL', e);
            }
        });

        setImageUrls(urls);

        return () => {
            urls.forEach(url => url.startsWith('blob:') && URL.revokeObjectURL(url));
        };
    }, [data]);

    const handleSort = (key: SortKey) => {
        if (sortKey !== key) {
            setSortKey(key);
            setSortDir('asc');
        } else {
            const next = nextDir(sortDir);
            setSortDir(next);
            if (next === 'none') setSortKey(null);
        }
    };

    const dirFor = (key: SortKey): SortDir =>
        sortKey === key ? sortDir : 'none';

    const sorted = (() => {
        const base = data ? [...data].sort((a, b) => b.documentId - a.documentId) : [];
        if (!sortKey || sortDir === 'none') return base;

        return [...base].sort((a, b) => {
            const topA = [...(a.recognitionResults || [])].sort((x, y) => y.probability - x.probability)[0];
            const topB = [...(b.recognitionResults || [])].sort((x, y) => y.probability - x.probability)[0];

            let valA: string | number = '';
            let valB: string | number = '';

            switch (sortKey) {
                case 'fileName':
                    valA = a.fileName.toLowerCase();
                    valB = b.fileName.toLowerCase();
                    break;
                case 'label':
                    valA = topA?.label?.toLowerCase() ?? '';
                    valB = topB?.label?.toLowerCase() ?? '';
                    break;
                case 'modelType':
                    valA = topA?.modelType ?? 0;
                    valB = topB?.modelType ?? 0;
                    break;
                case 'probability':
                    valA = topA?.probability ?? 0;
                    valB = topB?.probability ?? 0;
                    break;
            }

            if (valA < valB) return sortDir === 'asc' ? -1 : 1;
            if (valA > valB) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
    })();

    const thStyle: React.CSSProperties = { cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' };

    return (
        <div className="doc-table-wrapper">
            <div className="doc-table-header">
                <span className="doc-table-title">{title}</span>
                {data && <span className="doc-table-count">{data.length} записей</span>}
                {tableActions}
            </div>

            {!data || data.length === 0 ? (
                <div className="empty-state">
                    <span className="empty-state-icon">🗂️</span>
                    Документы не найдены
                </div>
            ) : (
                <table className="dt">
                    <thead>
                        <tr>
                            <th style={{ width: 60 }}></th>
                            <th style={thStyle} onClick={() => handleSort('fileName')}>
                                Файл <SortIcon dir={dirFor('fileName')} />
                            </th>
                            <th style={thStyle} onClick={() => handleSort('modelType')}>
                                Символ <SortIcon dir={dirFor('modelType')} />
                            </th>
                            <th style={thStyle} onClick={() => handleSort('label')}>
                                Модель <SortIcon dir={dirFor('label')} />
                            </th>
                            <th style={thStyle} onClick={() => handleSort('probability')}>
                                Точность <SortIcon dir={dirFor('probability')} />
                            </th>
                            {actions && <th></th>}
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map(row => {
                            const results = [...(row.recognitionResults || [])].sort(
                                (a, b) => b.probability - a.probability
                            );
                            const imgUrl = imageUrls.get(row.documentId);

                            return (
                                <Fragment key={row.documentId}>
                                    <tr 
                                    // className={results.length ? (row.fileName.indexOf(results[0].label) >= 0 ? 'yellow' : 'red') : ''}
                                        >
                                        <td rowSpan={results.length || 1}>
                                            {imgUrl ? (
                                                <img src={imgUrl} alt={row.fileName} className="doc-thumb" />
                                            ) : (
                                                <div className="doc-thumb-placeholder">📄</div>
                                            )}
                                        </td>
                                        <td rowSpan={results.length || 1} style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                                            {row.fileName}
                                        </td>
                                        <td rowSpan={results.length || 1}>
                                            {results[0]?.modelType && (
                                                <span className="label-badge">{results[0].modelType}</span>
                                            )}
                                        </td>
                                        <td>
                                            {results[0]?.label && (
                                                <span className="label-badge">{results[0].label}</span>
                                            )}
                                        </td>
                                        <td>
                                            {results[0] != null && (
                                                <ProbBar value={results[0].probability} />
                                            )}
                                        </td>
                                        {actions && (
                                            <td rowSpan={results.length || 1}>{actions(row.documentId)}</td>
                                        )}
                                    </tr>
                                    {results.slice(1).map((rr, idx) => (
                                        <tr key={`${row.documentId}-${idx}`}>
                                            <td>
                                                <span className="label-badge">{rr.label}</span>
                                            </td>
                                            <td>
                                                <ProbBar value={rr.probability} />
                                            </td>
                                        </tr>
                                    ))}
                                </Fragment>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </div>
    );
}

function ProbBar({ value }: { value: number }) {
    const pct = Math.round(value * 100);
    return (
        <div className="prob-bar-wrap">
            <div className="prob-bar">
                <div className="prob-bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="prob-text">{pct}%</span>
        </div>
    );
}
