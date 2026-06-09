import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post } from '../../Services/ApiClient';
import { IRecognizedDocumentDto } from '../../Interfaces/IRecognizedDocumentDto';
import DocumentTable from '../../Components/DocumentTable';

export default function NotProcessedDocumentsPage() {
    const queryClient = useQueryClient();

    const { data } = useQuery<IRecognizedDocumentDto[]>({
        queryKey: ['api/documents', 'hasProbability=false'],
        queryFn: () => get('api/documents', { params: { hasProbability: false } }),
        refetchInterval: 3000,
        refetchIntervalInBackground: false,
    });

    const aiModelTypes = useQuery<string[]>({
        queryKey: ['api/aiModelTypes'],
        queryFn: () => get('api/aiModelTypes'),
    });

    useEffect(() => {
        if (!selectedModel && aiModelTypes.data){
            setSelectedModel(aiModelTypes.data[aiModelTypes.data.length - 1])
        }
    }, [aiModelTypes.data])

    const [disabledButtons, setDisabledButtons] = useState<Map<number, boolean>>(new Map());

    // ── Model selection state ──
    const [selectedModel, setSelectedModel] = useState<string>();

    const reprocess = useMutation({
        mutationKey: ['api/documents/reprocess'],
        mutationFn: (documentIds: number[]) =>
            post('api/documents/reprocess', {
                documentIds: documentIds,
                modelType: selectedModel,
                useTunedModels: useTunedModels,
            }, {
                headers: { 'Content-Type': 'application/json' },
            }),
        onSuccess: (_, documentIds) => {
            setDisabledButtons(prev => {
                let map = new Map(prev);
                documentIds.forEach(dId => map.set(dId, true));
                return map;
            })
            setTimeout(() => {
                setDisabledButtons(prev => {
                    const m = new Map(prev);
                    documentIds.forEach(documentId => {
                        m.delete(documentId);
                    });
                    return m;
                });
                queryClient.invalidateQueries({ queryKey: ['api/documents'] });
            }, 10_000);
        },
        onError: (err, documentIds) => {
            console.error('Reprocess failed:', err);
            setDisabledButtons(prev => {
                const m = new Map(prev);
                documentIds.forEach(documentId => {
                    m.delete(documentId);
                });
                return m;
            });
        },
    });

    const [useTunedModels, setUseTunedModels] = useState<boolean>(false);

    return (
        <>
            <h1 className="page-title">Необработанные файлы</h1>
            {/* Model selection dropdown */}
            <div className="flex-box">
                <label htmlFor="modelSelect" className="model-selector-label">
                    Модель распознавания:
                    {aiModelTypes.isSuccess && 
                        <select
                            id="modelSelect"
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className="model-select"
                            disabled={reprocess.isPending}
                        >
                            {aiModelTypes.data.map(t => {
                                return (<option key={t} value={t}>{t}</option>)
                            })}
                        </select>
                    }
                </label>
                <label className='model-selector-label'>
                    Использовать дообученные
                    <input 
                        type='checkbox'
                        checked={useTunedModels}
                        onChange={(e) => setUseTunedModels(e.target.checked)}
                    />
                </label>
            </div>
            <DocumentTable
                data={data!}
                title="Необработанные файлы"
                countPredictions={0}
                hideColumns={["tunedModelTypes", "checkBox"]}
                documentActions={(documentId) => (
                    <button
                        key={documentId}
                        className="btn btn-ghost btn-sm"
                        onClick={() => reprocess.mutate([documentId])}
                        disabled={disabledButtons.has(documentId) || reprocess.isPending}
                    >
                        {reprocess.isPending && reprocess.variables.filter(v => v === documentId)
                            ? <><span className="spinner" /> Обработка...</>
                            : 'Повторить'}
                    </button>
                )}
                tableActions={(
                    <button
                        key={"reprocess_all"}
                        className="btn btn-ghost btn-sm"
                        onClick={() => reprocess.mutate(data!.map(d => d.documentId))}
                        disabled={!data?.length}
                    >
                        Повторить все
                    </button>
                )}
            />
        </>
    );
}
