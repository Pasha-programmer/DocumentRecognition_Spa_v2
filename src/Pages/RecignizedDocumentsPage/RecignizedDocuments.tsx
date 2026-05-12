import { useQuery, useQueryClient } from '@tanstack/react-query';
import { get } from '../../Services/ApiClient';
import { IRecognizedDocumentDto } from '../../Interfaces/IRecognizedDocumentDto';
import DocumentTable from '../../Components/DocumentTable';

export default function RecognizedDocumentsPage() {
    const queryClient = useQueryClient();

    const { data } = useQuery<IRecognizedDocumentDto[]>({
        queryKey: ['api/documents', 'hasProbability=true'],
        queryFn: () => get('api/documents', { params: { hasProbability: true } }),
    }, queryClient);

    return (
        <>
            <h1 className="page-title">Распознанные документы</h1>
            <DocumentTable data={data!} title="Распознанные документы" />
        </>
    );
}
