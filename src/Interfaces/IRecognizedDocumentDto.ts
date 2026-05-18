import { IRecognitionResult } from "./IRecognitionResult";

export interface IRecognizedDocumentDto
{
    documentId: number;
    fileName: string;
    fileBlob: string | Blob;
    selectedModelType: string;
    recognitionResults: IRecognitionResult[]
}