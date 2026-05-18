export interface IRecognitionResult
{
    documentId: number;
    modelType: string;
    label: string;
    probability: number;
}