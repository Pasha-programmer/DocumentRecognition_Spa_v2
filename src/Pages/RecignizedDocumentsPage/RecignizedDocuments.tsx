import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, destroy } from '../../Services/ApiClient';
import { IRecognizedDocumentDto } from '../../Interfaces/IRecognizedDocumentDto';
import DocumentTable from '../../Components/DocumentTable';
import { useEffect, useState } from 'react';

export default function RecognizedDocumentsPage() {
    const queryClient = useQueryClient();

    const { data, refetch } = useQuery<IRecognizedDocumentDto[]>({
        queryKey: ['api/documents', 'hasProbability=true'],
        queryFn: () => get('api/documents', { params: { hasProbability: true } }),
        refetchInterval: 5000
    }, queryClient);

    const deleteDocument = useMutation({
        mutationKey: ['api/documents/delete'],
        mutationFn: (documentId: number) => destroy(`api/documents/${documentId}`),
        onSuccess: () => {
            refetch()
        },
        onError: (err) => console.error('Upload failed:', err),
    }, queryClient);

    const deleteDocuments = useMutation({
        mutationKey: ['api/documents/delete'],
        mutationFn: (documentIds: number[]) => destroy(`api/documents`, { params: {documentIds: documentIds}}),
        onSuccess: () => {
            refetch()
        },
        onError: (err) => console.error('Upload failed:', err),
    }, queryClient);

    const [countPredictions, setCountPredictions] = useState(1)
    const [maxCountPredictions, setMaxCountPredictions] = useState(1)

    useEffect(() => {
        if (data && data.length > 0) {
            const maxCount = Math.max(...data.map(d => d.recognitionResults.length))
            setMaxCountPredictions(maxCount)
            // Не меняем countPredictions, если оно не установлено или вышло за пределы
            setCountPredictions(prev => Math.min(prev, maxCount))
        } else if (data && data.length === 0) {
            setMaxCountPredictions(1)
            setCountPredictions(1)
        }
    }, [data])

    return (
        <>
            <h1 className="page-title">Распознанные документы</h1>
            {data && 
                <DocumentTable 
                    data={data} 
                    title="Распознанные документы" 
                    countPredictions={countPredictions}
                    actions={(documentId: number) => {
                        return (
                            <button 
                                key={"reprocess_all"}
                                className="btn btn-ghost btn-sm red"
                                onClick={() => deleteDocument.mutate(documentId)}
                                disabled={!data?.length}>
                                Удалить
                            </button>
                        )
                    }}
                    tableActions={
                        <>
                        {data.length ?
                            <select
                                id="modelSelect"
                                value={countPredictions}
                                onChange={(e) => setCountPredictions(Number.parseInt(e.target.value))}
                                className="model-select"
                                disabled={!data}
                                style={{maxWidth: 70}}
                            >
                            {Array.from({ length: maxCountPredictions }, (_, i) => i + 1).map(n => (
                                    <option key={n} value={n}>{n}</option>
                                ))}
                            </select>
                            : undefined}
                        <button
                            key={"reprocess_all"}
                            className="btn btn-ghost btn-sm red"
                            onClick={() => deleteDocuments.mutate(data.map(d => d.documentId))}
                            disabled={!data?.length}
                            >
                            Удалить
                        </button>
                        </>
                    }
                />}
        </>
    );
}
