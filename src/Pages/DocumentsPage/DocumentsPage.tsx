import { useQuery, useQueryClient } from '@tanstack/react-query';
import { get } from '../../Services/ApiClient';
import { IRecognizedDocumentDto } from '../../Interfaces/IRecognizedDocumentDto';
import DocumentTable from '../../Components/DocumentTable';

export default function DocumentsPage(props: { title?: string }) {
    const queryClient = useQueryClient();

    const { data } = useQuery<IRecognizedDocumentDto[]>({
        queryKey: ['api/documents'],
        queryFn: () => get('api/documents'),
    }, queryClient);

    return (
        <>
            <h1 className="page-title">Все документы</h1>
            <DocumentTable data={data!} title={props.title ?? 'Все документы'} countPredictions={0}/>
        </>
    );
}
