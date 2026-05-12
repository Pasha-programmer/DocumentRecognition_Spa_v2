export interface IRecognitionResult
{
    documentId: number;
    modelType: number;
    label: string;
    probability: number;
}