import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, destroy, put, post } from '../../Services/ApiClient';
import { IRecognizedDocumentDto } from '../../Interfaces/IRecognizedDocumentDto';
import DocumentTable from '../../Components/DocumentTable';
import { useCallback, useEffect, useState } from 'react';
import { IRecognitionResult } from '../../Interfaces/IRecognitionResult';
import { ITunedPredictionDto } from '../../Interfaces/ITunedPredictionDto';

export default function ManualRecognizedDocumentsPage() {
    const queryClient = useQueryClient();

    const { data } = useQuery<IRecognizedDocumentDto[]>({
        queryKey: ['api/documents', 'hasProbability=true'],
        queryFn: () => get('api/documents', { 
            params: { 
                hasProbability: true,
                recognitionTypes: ["Manual"]
            } 
        }),
    }, queryClient);

    const tunedPredictions = useQuery<ITunedPredictionDto[]>({
        queryKey: ['api/aiModelTuning/prediction'],
        queryFn: () => get('api/aiModelTuning/prediction'),
    }, queryClient);

    const aiModelTypes = useQuery<string[]>({
        queryKey: ['api/aiModelTypes'],
        queryFn: () => get('api/aiModelTypes'),
    });

    useEffect(() => {
        if (tunedPredictions.data && data){
            data.forEach(element => {
                element.recognitionResults.forEach(rr => {
                    rr.tunedModelTypes = tunedPredictions.data!.filter(tp => tp.documentPredictionId == rr.id).map(tp => tp.modelType)
                })
            });
        }
    }, [tunedPredictions, data])

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

    const startTuneDocumentPrediction = useMutation({
        mutationKey: ['api/aiModelTuning'],
        mutationFn: (props: {aiModelType: string, documentPredictionIds: number[]}) => post(`api/aiModelTuning`, {
            aiModelType: props.aiModelType,
            documentPredictionIds: props.documentPredictionIds, 
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['api/documents']
            });
        },
        onError: (err) => console.error('Delete failed:', err),
    }, queryClient);

    const [editDocumentPredictionIds, setEditDocumentPredictionIds] = useState<number[]>([])

    const [selectedModel, setSelectedModel] = useState<string>();

    const handleEditManualDocumentPrediction = useCallback((documentPredictionId: number) => {
        setEditDocumentPredictionIds(prev => [...prev, documentPredictionId])
    }, [])

    const handleSaveManualDocumentPrediction = useCallback((recognitionResult: IRecognitionResult) => {
        if (!recognitionResult.id || recognitionResult.id < 0){
            return
        }

        const savePromise = updateManualDocumentPrediction.mutateAsync(recognitionResult)
        savePromise.then(savedResult => {
            if (savedResult) {
                setEditDocumentPredictionIds(prev => prev.filter(id => Math.abs(id) !== Math.abs(recognitionResult.id!)));
            }
        }).catch(err => console.error('Save failed:', err));
    }, [])

    const handleCancelManualDocumentPrediction = useCallback((documentPredictionId: number) => {
        setEditDocumentPredictionIds(prev => prev.filter(id => id !== documentPredictionId))
    }, [])

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

    const [checkedMap, setCheckedMap] = useState<IRecognizedDocumentDto[]>([])

    const handleSendToTune = useCallback(() => {
        startTuneDocumentPrediction.mutateAsync({
            aiModelType: selectedModel!,
            documentPredictionIds: checkedMap.flatMap(x => x.recognitionResults.map(rr => rr.id!))
        }) 
    }, [selectedModel, checkedMap])

    return (
        <>
            <h1 className="page-title">Символы обработанные вручную</h1>
            <div className='flex-box'>
                <div className="label-value">
                    <label htmlFor="modelSelect">
                        Модель распознавания
                        {aiModelTypes.isSuccess && <select
                            id="modelSelect"
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className="model-select"
                        >
                            {aiModelTypes.data.map(t => {
                                return (<option key={t} value={t}>{t}</option>)
                            })}
                        </select>}
                    </label>
                </div>
                <button 
                    className='btn btn-primary' 
                    onClick={() => handleSendToTune()}
                    disabled={!checkedMap.length}>
                    Отправить на дообучение
                </button>
            </div>

            {data &&
                <DocumentTable
                    data={data}
                    title=''
                    editDocumentPredictionIds={editDocumentPredictionIds}
                    countPredictions={1}
                    onChangeChecked={(values) => setCheckedMap(values)}
                    hideColumns={["selectedModelType", "modelType", "probability"]}
                    documentPredictionActions={(documentId: number, documentPredictionId: number, editMode: boolean, newRecognitionResult: IRecognitionResult) => getDocumentPredictionActions(documentId, documentPredictionId, editMode, newRecognitionResult)}
                />}
        </>
    );
}
