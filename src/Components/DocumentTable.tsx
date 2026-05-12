import { Fragment, useEffect, useState } from 'react';
import { IRecognizedDocumentDto } from '../Interfaces/IRecognizedDocumentDto';

interface Props {
    data: IRecognizedDocumentDto[];
    title: string;
    actions?: (documentId: number) => JSX.Element;
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

export default function DocumentTable({ data, title, actions }: Props) {
    const [imageUrls, setImageUrls] = useState<Map<number, string>>(new Map());

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

    const sorted = data ? [...data].sort((a, b) => b.documentId - a.documentId) : [];

    return (
        <div className="doc-table-wrapper">
            <div className="doc-table-header">
                <span className="doc-table-title">{title}</span>
                {data && <span className="doc-table-count">{data.length} записей</span>}
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
                            <th>Файл</th>
                            <th>Символ</th>
                            <th>Точность</th>
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
                                    <tr>
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
