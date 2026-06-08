export interface IRecognitionResult
{
    id?: number;
    documentId: number;
    modelType?: string;
    recognitionType: string;
    label: string;
    probability: number;
    tunedModelTypes?: string[]
}