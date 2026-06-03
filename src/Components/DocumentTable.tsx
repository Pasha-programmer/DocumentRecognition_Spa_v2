import { Fragment, useCallback, useEffect, useState } from 'react';
import { IRecognizedDocumentDto } from '../Interfaces/IRecognizedDocumentDto';
import { IRecognitionResult } from '../Interfaces/IRecognitionResult';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { get } from '../Services/ApiClient';
import { exportToExcel } from '../Services/ExcelService';

interface Props {
    data: IRecognizedDocumentDto[];
    title: string;
    countPredictions: number;
    analysisModels?: AnalysisModelEnum[];
    onlyBest?: boolean;
    actions?: (documentId: number) => JSX.Element;
    tableActions?: JSX.Element;
}

interface KeyValuePair<K,V> {
    key: K,
    value: V
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

type SortKey = 'fileName' | 'label' | 'selectedModelType' | 'modelType' | 'probability';
type SortDir = 'asc' | 'desc' | 'none';
export enum AnalysisModelEnum {
    Average = "Среднее",
    SoftVoting = "Взвешенное голосование"
}

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


function groupBy(array: IRecognitionResult[], key: keyof IRecognitionResult): {} {
    return array.reduce((result, item: IRecognitionResult) => {
        const groupKey = item[key];
        if (!result[groupKey]) {
            result[groupKey] = [];
        }
        result[groupKey].push(item);
        return result;
    }, {});
}

/**
 * Возвращает уникальные элементы из последовательности
 * @param items - исходный массив
 * @param keySelector - опциональная функция выбора ключа для сравнения (аналог IEqualityComparer)
 * @returns массив с уникальными элементами
 */
function distinct<T>(items: T[]): T[];
function distinct<T, K>(items: T[], keySelector: (item: T) => K): T[];
function distinct<T, K>(items: T[], keySelector?: (item: T) => K): T[] {
  if (!items || items.length === 0) {
    return [];
  }

  if (!keySelector) {
    // Простое сравнение по значению (аналог сравнения по умолчанию в .NET)
    return [...new Set(items)];
  }

  // Сравнение по выбранному ключу
  const seenKeys = new Set<K>();
  const result: T[] = [];

  for (const item of items) {
    const key = keySelector(item);
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      result.push(item);
    }
  }

  return result;
}

function exportRecognizedDocumentsToExcel(recognizedDocumentDto: IRecognizedDocumentDto[], aiModelTypes: string[]) {
    
    const formattedData = recognizedDocumentDto.map(rd => {

        let result: Record<string, any> = {
            'Имя файла': rd.fileName
        }

        Object.assign(result, Object.fromEntries(
            aiModelTypes
                .filter(m => m != "All")
                .flatMap(key => {
                    let recognitionResult = rd.recognitionResults.find(rr => rr.modelType == key);
                    return [
                        [`${key} (Символ)`, recognitionResult?.label ?? ''],
                        [`${key} (Вероятность)`, recognitionResult?.probability ? `${Math.round(recognitionResult.probability * 10000) / 100}%` : '']
                    ]
                })
        ));

        return result
    });

    exportToExcel(formattedData, 'Список_пользователей', 'Пользователи');
};

export default function DocumentTable(props: Props) {
    const [imageUrls, setImageUrls] = useState<Map<number, string>>(new Map());
    const [sortKey, setSortKey] = useState<SortKey | null>(null);
    const [sortDir, setSortDir] = useState<SortDir>('none');

    const [slimMode, setSlimMode] = useState(false);

    const [data, setData] = useState([...props.data || []]);

    const isDev = true;

    const queryClient = useQueryClient();

    const aiModelsAccuracy = useQuery<KeyValuePair<string, number>[]>({
        queryKey: ['api/documents/aiModelTypes/test-accuracy'],
        queryFn: () => get('api/documents/aiModelTypes/test-accuracy'),
        // enabled: props.includeSoftVotingPrediction
    }, queryClient);

    const aiModelTypes = useQuery<string[]>({
        queryKey: ['api/documents/aiModelTypes'],
        queryFn: () => get('api/documents/aiModelTypes'),
        enabled: false,
    });

    useEffect(() => {
        if (!props.data) return;
        const urls = new Map<number, string>();

        props.data.forEach(doc => {
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
    }, [props.data]);

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

    const getSortedData = useCallback(() => {
        const base = props.data ? [...props.data].sort((a, b) => b.documentId - a.documentId) : [];
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
    }, [props.data, sortKey, sortDir]);

    const thStyle: React.CSSProperties = { cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' };

    const getAveragePrediction = useCallback((results: IRecognitionResult[]): Partial<IRecognitionResult> | undefined => {
        let groups = groupBy(results, 'label')

        let sortedRecognitionResult = Object.keys(groups)
            .map(x => ({averageProbability: groups[x].map(xx => xx.probability).reduce((q, w) => q + w) / groups[x].length, items: groups[x]}))
            .sort((x: any, y: any) => y.averageProbability - x.averageProbability)

        if (!sortedRecognitionResult.length){
            return undefined
        }

        return {
            documentId: results[0].documentId,
            modelType: "Среднее",
            label: sortedRecognitionResult[0].items[0].label,
        }
    }, [])

    const getSoftVotingPrediction = useCallback((results: IRecognitionResult[]): Partial<IRecognitionResult> | undefined => {
        let groups = groupBy(results, 'label')
        let softVotingPrediction: Partial<IRecognitionResult> = {
            documentId: results[0].documentId,
            modelType: "Взвешенное голосование",
            label: "", 
            probability: 0,
        }

        Object.keys(groups).map(g => groups[g]).forEach((group: IRecognitionResult[]) => {
            let sum = group.map(g => {
                let aiModelAccuracy = aiModelsAccuracy.data?.find(m => m.key === g.modelType)?.value ?? 0
                return g.probability * aiModelAccuracy
            }).reduce((sum, p) => sum + p)

            if (softVotingPrediction.probability! < sum){
                softVotingPrediction.probability = sum
                softVotingPrediction.label = group[0].label
            }
        });

        if (softVotingPrediction.probability = 0){
            return undefined
        }

        softVotingPrediction.probability = undefined

        return softVotingPrediction
    }, [aiModelsAccuracy.data])

    const getAggregatedData = useCallback((recognizedDocuments: IRecognizedDocumentDto[]) => {
        return recognizedDocuments.map(row => {

            let results: IRecognitionResult[] = [...row.recognitionResults].sort(
                (a, b) => b.probability - a.probability
            )

            if (props.onlyBest){
                results = distinct(results, x => x.modelType);
            }

            if (row.selectedModelType == 'All'){
                let averageIndex = props.analysisModels?.indexOf(AnalysisModelEnum.Average) ?? -1;
                let softVotingIndex = props.analysisModels?.indexOf(AnalysisModelEnum.SoftVoting) ?? -1;

                const averageRecognitionResult = averageIndex >= 0
                    ? getAveragePrediction(results)
                    : null

                const softVotingRecognitionResult = softVotingIndex >= 0 
                    ? getSoftVotingPrediction(results)
                    : null

                const sortedAnalysisModels = [
                    {index: averageIndex, value: averageRecognitionResult}, 
                    {index: softVotingIndex, value: softVotingRecognitionResult}
                ].sort((a, b) => a.index - b.index)
                    .map(x => x.value)

                results = [...sortedAnalysisModels, ...results].filter(x => x) as IRecognitionResult[]
            }

            return {
                ...row,
                recognitionResults: results
            }
        })
    }, [getAveragePrediction, getSoftVotingPrediction, props.analysisModels, props.onlyBest])

    const handleExport = useCallback((recognizedDocumentDto: IRecognizedDocumentDto[]) => {
        aiModelTypes.refetch().then(r => {
            if (r.data){
                exportRecognizedDocumentsToExcel(recognizedDocumentDto, r.data)
            }
        })
    }, [])

    useEffect(() => {
        const sortedData = getSortedData()
        setData([...getAggregatedData(sortedData)])
    }, [getAggregatedData, getSortedData])

    return (
        <div className="doc-table-wrapper">
            <div className="doc-table-header">
                <div className="doc-table-header-main">
                    <span className="doc-table-title">{props.title}</span>
                    {data && <span className="doc-table-count">
                        {data.length} записей
                        {isDev && <span>
                            ({data.filter(d => d.fileName.indexOf(d.recognitionResults[0]?.label) >= 0).length} 
                            / 
                            {data.length - data.filter(d => d.fileName.indexOf(d.recognitionResults[0]?.label) >= 0).length})
                        </span>}
                    </span>}
                    <button
                        className='btn btn-primary btn-sm'
                        onClick={() => handleExport(props.data)}
                    >
                        Экспорт в Excel
                    </button>
                </div>
                <div className="doc-table-header-secondary">
                    <label className="label-value">
                        <input 
                            type='checkbox'
                            checked={slimMode}
                            onChange={(e) => {
                                setSlimMode(e.target.checked);
                            }}
                            disabled={!data}
                        />
                        Компактный режим
                    </label>
                </div>
                <div className="doc-table-header-secondary">
                    {props.tableActions}
                </div>
            </div>

            {!data || data.length === 0 ? (
                <div className="empty-state">
                    <span className="empty-state-icon">🗂️</span>
                    Документы не найдены
                </div>
            ) : (
                <table className={"dt" + (slimMode ? " slim" : "")}>
                    <thead>
                        <tr>
                            <th style={{ width: 60 }}></th>
                            <th style={thStyle} onClick={() => handleSort('fileName')}>
                                Файл <SortIcon dir={dirFor('fileName')} />
                            </th>
                            <th style={thStyle} onClick={() => handleSort('selectedModelType')}>
                                Выбранная модель <SortIcon dir={dirFor('selectedModelType')} />
                            </th>
                            <th style={thStyle} onClick={() => handleSort('modelType')}>
                                Модель <SortIcon dir={dirFor('modelType')} />
                            </th>
                            <th style={thStyle} onClick={() => handleSort('label')}>
                                Символ <SortIcon dir={dirFor('label')} />
                            </th>
                            <th style={thStyle} onClick={() => handleSort('probability')}>
                                Точность <SortIcon dir={dirFor('probability')} />
                            </th>
                            {props.actions && <th></th>}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map(row => {

                            const imgUrl = imageUrls.get(row.documentId);

                            const rowSpan = Math.max(Math.min(row.recognitionResults.length, props.countPredictions), 1)

                            return (
                                <Fragment key={row.documentId}>
                                    <tr className={isDev && row.recognitionResults.length ? (row.fileName.indexOf(row.recognitionResults[0].label) >= 0 ? 'yellow' : 'red') : ''}>
                                        <td rowSpan={rowSpan}>
                                            {imgUrl ? (
                                                <img src={imgUrl} alt={row.fileName} className="doc-thumb" />
                                            ) : (
                                                <div className="doc-thumb-placeholder">📄</div>
                                            )}
                                        </td>
                                        <td rowSpan={rowSpan} 
                                            style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                                            {row.fileName}
                                        </td>
                                        <td rowSpan={rowSpan}>
                                            <span className="label-badge">{row.selectedModelType}</span>
                                        </td>
                                        <td>
                                            {(row.recognitionResults.length > 0 && <span className="label-badge">{row.recognitionResults[0].modelType}</span>)}
                                        </td>
                                        <td>
                                            {row.recognitionResults.length > 0 && <span className="label-badge">{row.recognitionResults[0].label}</span>}
                                        </td>
                                        <td>
                                            {row.recognitionResults.length > 0 && row.recognitionResults[0].probability && <ProbBar value={row.recognitionResults[0].probability} />}
                                        </td>
                                        {props.actions && (
                                            <td rowSpan={rowSpan}>
                                                {props.actions(row.documentId)}
                                            </td>
                                        )}
                                    </tr>
                                    {row.recognitionResults.slice(1, props.countPredictions).map((rr, idx) => (
                                        <tr key={`${row.documentId}-${idx}`} 
                                            className={isDev && row.recognitionResults.length ? (row.fileName.indexOf(row.recognitionResults[0].label) >= 0 ? 'yellow' : 'red') : ''}>
                                            <td>
                                                <span className="label-badge">{rr.modelType}</span>
                                            </td>
                                            <td>
                                                <span className="label-badge">{rr.label}</span>
                                            </td>
                                            <td>
                                                {rr.probability && <ProbBar value={rr.probability} />}
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
