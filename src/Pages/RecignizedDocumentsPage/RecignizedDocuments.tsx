import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, destroy, post, put } from '../../Services/ApiClient';
import { IRecognizedDocumentDto } from '../../Interfaces/IRecognizedDocumentDto';
import DocumentTable from '../../Components/DocumentTable';
import { AnalysisModelEnum } from '../../Components/DocumentTable';
import { useCallback, useEffect, useState } from 'react';
import { IRecognitionResult } from '../../Interfaces/IRecognitionResult';

export default function RecognizedDocumentsPage() {
    const queryClient = useQueryClient();

    const { data } = useQuery<IRecognizedDocumentDto[]>({
        queryKey: ['api/documents', 'hasProbability=true'],
        queryFn: () => get('api/documents', { params: { hasProbability: true } }),
    }, queryClient);

    const deleteDocument = useMutation({
        mutationKey: ['api/documents/delete'],
        mutationFn: (documentId: number) => destroy(`api/documents/${documentId}`),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['api/documents']
            });
        },
        onError: (err) => console.error('Delete failed:', err),
    }, queryClient);

    const deleteDocuments = useMutation({
        mutationKey: ['api/documents/delete'],
        mutationFn: (documentIds: number[]) => destroy(`api/documents`, { params: { documentIds: documentIds } }),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['api/documents']
            });
        },
        onError: (err) => console.error('Delete failed:', err),
    }, queryClient);

    const deleteDocumentPrediction = useMutation({
        mutationKey: ['api/documents/delete'],
        mutationFn: (props: {documentId: number, documentPredictionId: number}) => destroy(`api/documents/${props.documentId}/document-prediction/${props.documentPredictionId}`),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['api/documents']
            });
        },
        onError: (err) => console.error('Delete failed:', err),
    }, queryClient);

    const addManualDocumentPrediction = useMutation({
        mutationKey: ['api/documents/{id}/manual-prediction'],
        mutationFn: (recognitionResult: IRecognitionResult) => post(`api/documents/${recognitionResult.documentId}/manual-prediction`, recognitionResult),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['api/documents']
            });
        },
        onError: (err) => console.error('Add manual document prediction failed:', err),
    }, queryClient);

    const updateManualDocumentPrediction = useMutation({
        mutationKey: ['api/documents/{id}/manual-prediction/{documentPredictionId}'],
        mutationFn: (recognitionResult: IRecognitionResult) => put(`api/documents/${recognitionResult.documentId}/manual-prediction/${recognitionResult.id}`, recognitionResult),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['api/documents']
            });
        },
        onError: (err) => console.error('Add manual document prediction failed:', err),
    }, queryClient);

    const [countPredictions, setCountPredictions] = useState(1)
    const [maxCountPredictions, setMaxCountPredictions] = useState(1)

    const [onlyBest, setOnlyBest] = useState(false)

    const [analysisModels, setAnalysisModels] = useState<AnalysisModelEnum[]>([])

    const [editDocumentPredictionIds, setEditDocumentPredictionIds] = useState<number[]>([])

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

    const handleEditManualDocumentPrediction = useCallback((documentPredictionId: number) => {
        setEditDocumentPredictionIds(prev => [...prev, documentPredictionId])
    }, [])

    const handleSaveManualDocumentPrediction = useCallback((recognitionResult: IRecognitionResult) => {
        const savePromise = recognitionResult.id && recognitionResult.id >= 0
            ? updateManualDocumentPrediction.mutateAsync(recognitionResult)
            : addManualDocumentPrediction.mutateAsync(recognitionResult)

        savePromise.then(savedResult => {
            if (savedResult) {
                setEditDocumentPredictionIds(prev => prev.filter(id => Math.abs(id) !== Math.abs(recognitionResult.id!)));
            }
        }).catch(err => console.error('Save failed:', err));
    }, [])

    const handleCancelManualDocumentPrediction = useCallback((documentPredictionId: number) => {
        setEditDocumentPredictionIds(prev => prev.filter(id => id !== documentPredictionId))
    }, [])

    const getDocumentActions = useCallback((documentId: number, editMode: boolean) => {

        const currentDocumentPredictions = data?.find(d => d.documentId === documentId)?.recognitionResults
            .sort((a,b) => b.probability - a.probability);

        const canAddManual =  currentDocumentPredictions && !currentDocumentPredictions.find(rr => rr.recognitionType === "Manual")

        return (
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '5px' }}>
                {!editMode && canAddManual && 
                    <button
                        key={"edit_recognition"}
                        className='btn btn-ghost btn-sm'
                        onClick={() => handleEditManualDocumentPrediction(currentDocumentPredictions![0].id!)}>
                        ✍
                    </button>
                }
                {!editMode &&
                    <button
                        key={"delete_recognition"}
                        className="btn btn-danger btn-sm"
                        onClick={() => deleteDocument.mutate(documentId)}>
                        🗑️
                    </button>
                }
            </div>
        )
    }, [data, deleteDocument, handleEditManualDocumentPrediction])

    const getDocumentPredictionActions = useCallback((documentId: number, documentPredictionId: number, editMode: boolean, newRecognitionResult: IRecognitionResult) => {

        const currentDocumentPredictions = data?.find(d => d.documentId === documentId)?.recognitionResults;
        const currentDocumentPrediction = currentDocumentPredictions?.find(rr => rr.id === documentPredictionId)

        const canEdit = currentDocumentPrediction?.recognitionType === "Manual"

        return (
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '5px' }}>
                {!editMode && canEdit && 
                    <button
                        key={"edit_recognition"}
                        className='btn btn-ghost btn-sm'
                        onClick={() => handleEditManualDocumentPrediction(documentPredictionId)}>
                        ✏️
                    </button>
                }
                {editMode &&
                    <>
                        <button
                            key={"save_recognition"}
                            className='btn btn-primary btn-sm'
                            onClick={() => handleSaveManualDocumentPrediction(newRecognitionResult)}>
                            ✔️
                        </button>
                        <button
                            key={"cancel_edit_recognition"}
                            className='btn btn-ghost btn-sm'
                            onClick={() => handleCancelManualDocumentPrediction(documentPredictionId)}>
                            ⏎
                        </button>
                    </>
                }
                {!editMode &&
                    <button
                        key={"delete_recognition"}
                        className="btn btn-danger btn-sm"
                        onClick={() => deleteDocumentPrediction.mutate({documentId: documentId, documentPredictionId: documentPredictionId})}>
                        🗑️
                    </button>
                }
            </div>
        )
    }, [data, editDocumentPredictionIds, handleEditManualDocumentPrediction, handleSaveManualDocumentPrediction, handleCancelManualDocumentPrediction, deleteDocumentPrediction])

    const predictionOptionValues = [{ label: "Все", value: maxCountPredictions + 1 }]
        .concat(Array.from({ length: maxCountPredictions + 1 }, (_, i) => ({ label: (i).toString(), value: i })))

    return (
        <>
            <h1 className="page-title">Распознанные документы</h1>
            {data &&
                <DocumentTable
                    data={data}
                    editDocumentPredictionIds={editDocumentPredictionIds}
                    title="Распознанные документы"
                    countPredictions={countPredictions}
                    analysisModels={analysisModels}
                    hideColumns={["tunedModelTypes", "checkBox"]}
                    onlyBest={onlyBest}
                    documentPredictionActions={(documentId: number, documentPredictionId: number, editMode: boolean, newRecognitionResult: IRecognitionResult) => getDocumentPredictionActions(documentId, documentPredictionId, editMode, newRecognitionResult)}
                    documentActions={(documentId: number, editMode: boolean) => getDocumentActions(documentId, editMode)}
                    tableActions={
                        <>
                            <div className="label-value">
                                <label>
                                    Анализ
                                </label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    {Object.values(AnalysisModelEnum).map((value, i) => (
                                        <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <input
                                                type="checkbox"
                                                value={value}
                                                checked={analysisModels.includes(value)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setAnalysisModels([...analysisModels, value]);
                                                    } else {
                                                        setAnalysisModels(analysisModels.filter(v => v !== value));
                                                    }
                                                }}
                                                disabled={!data}
                                            />
                                            {value}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {data.length ?
                                <div className="label-value">
                                    <label htmlFor="modelSelect">
                                        Количество предсказаний
                                    </label>
                                    <select
                                        id="modelSelect"
                                        value={countPredictions}
                                        onChange={(e) => setCountPredictions(Number.parseInt(e.target.value))}
                                        className="model-select"
                                        disabled={!data}
                                        style={{ maxWidth: 70 }}
                                    >
                                        {predictionOptionValues.map(v => (
                                            <option key={v.label + v.value} value={v.value}>{v.label}</option>
                                        ))}
                                    </select>
                                </div>
                                : undefined}
                            <div className="label-value">
                                <label title='Только лучшее от модели'
                                    style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <input
                                        type='checkbox'
                                        checked={onlyBest}
                                        onChange={(e) => {
                                            setOnlyBest(e.target.checked);
                                        }}
                                        disabled={!data}
                                    />
                                    Лучшее
                                </label>
                            </div>
                            <button
                                key={"reprocess_all"}
                                className="btn btn-danger btn-sm"
                                onClick={() => deleteDocuments.mutate(data.map(d => d.documentId))}
                                disabled={!data?.length}
                            >
                                Удалить все
                            </button>
                        </>
                    }
                />}
        </>
    );
}
