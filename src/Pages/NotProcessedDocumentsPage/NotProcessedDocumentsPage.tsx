import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post } from '../../Services/ApiClient';
import { IRecognizedDocumentDto } from '../../Interfaces/IRecognizedDocumentDto';
import DocumentTable from '../../Components/DocumentTable';

export default function NotProcessedDocumentsPage() {
    const queryClient = useQueryClient();

    const { data } = useQuery<IRecognizedDocumentDto[]>({
        queryKey: ['api/documents', 'hasProbability=false'],
        queryFn: () => get('api/documents', { params: { hasProbability: false } }),
    });

    const [disabledButtons, setDisabledButtons] = useState<Map<number, boolean>>(new Map());

    // ── Model selection state ──
    const [selectedModel, setSelectedModel] = useState<number>(3);

    const reprocess = useMutation({
        mutationKey: ['api/documents/reprocess'],
        mutationFn: (documentId: number) =>
            post('api/documents/reprocess', {
                documentId: documentId,
                modelType: selectedModel
            }, {
                headers: { 'Content-Type': 'application/json' },
            }),
        onSuccess: (_, documentId) => {
            setDisabledButtons(prev => new Map(prev).set(documentId, true));
            setTimeout(() => {
                setDisabledButtons(prev => {
                    const m = new Map(prev);
                    m.delete(documentId);
                    return m;
                });
                queryClient.invalidateQueries({ queryKey: ['api/documents'] });
            }, 10_000);
        },
        onError: (err, documentId) => {
            console.error('Reprocess failed:', err);
            setDisabledButtons(prev => {
                const m = new Map(prev);
                m.delete(documentId);
                return m;
            });
        },
    });

    return (
        <>
            <h1 className="page-title">Необработанные файлы</h1>
            {/* Model selection dropdown */}
            <div className="model-selector">
                <label htmlFor="modelSelect" className="model-selector-label">
                    Модель распознавания:
                </label>
                <select
                    id="modelSelect"
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(Number.parseInt(e.target.value))}
                    className="model-select"
                    disabled={reprocess.isPending}
                >
                    <option value="1">v1</option>
                    <option value="2">v2</option>
                    <option value="3">v3</option>
                </select>
            </div>
            <DocumentTable
                data={data!}
                title="Необработанные файлы"
                actions={(documentId) => (
                    <button
                        key={documentId}
                        className="btn btn-ghost btn-sm"
                        onClick={() => reprocess.mutate(documentId)}
                        disabled={disabledButtons.has(documentId) || reprocess.isPending}
                    >
                        {reprocess.isPending && reprocess.variables === documentId
                            ? <><span className="spinner" /> Обработка...</>
                            : 'Повторить'}
                    </button>
                )}
            />
        </>
    );
}
