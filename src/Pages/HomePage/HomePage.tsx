import { useCallback, useEffect, useRef, useState } from 'react';
import { post, get } from '../../Services/ApiClient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { endOfToday, startOfToday } from 'date-fns';
import { IRecognizedDocumentDto } from '../../Interfaces/IRecognizedDocumentDto';
import DocumentTable from '../../Components/DocumentTable';

export default function HomePage() {
    // ── Camera state ──
    const [cameraOpen, setCameraOpen] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [cameraLoading, setCameraLoading] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // ── Files state ──
    const [files, setFiles] = useState<File[]>([]);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploaderKey, setUploaderKey] = useState(0);

     // ── Model selection state ──
    const [selectedModel, setSelectedModel] = useState<string>("All");

    // ── API ──
    const queryClient = useQueryClient();

    const upload = useMutation({
        mutationKey: ['api/documents/upload'],
        mutationFn: (formData: FormData) => post('api/documents/upload', formData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['api/documents'] });
            setFiles([]);
            setUploaderKey(k => k + 1);
        },
        onError: (err) => console.error('Upload failed:', err),
    }, queryClient);

    const { data } = useQuery<IRecognizedDocumentDto[]>({
        queryKey: ['api/documents', startOfToday(), endOfToday()],
        queryFn: () => get('api/documents', {
            params: { fromDate: startOfToday(), toDate: endOfToday() },
        }),
    }, queryClient);

    const aiModelTypes = useQuery<string[]>({
        queryKey: ['api/aiModelTypes'],
        queryFn: () => get('api/aiModelTypes'),
    });

    useEffect(() => {
        if (!selectedModel && aiModelTypes.data){
            setSelectedModel(aiModelTypes.data[aiModelTypes.data.length - 1])
        }
    }, [aiModelTypes.data])

    // ── Camera logic ──
    const openCamera = useCallback(async () => {
        setCameraError(null);
        setCameraLoading(true);

        if (!window.isSecureContext) {
            setCameraError('Камера требует HTTPS. Откройте сайт по защищённому соединению.');
            setCameraLoading(false);
            return;
        }
        if (!navigator.mediaDevices?.getUserMedia) {
            setCameraError('Ваш браузер не поддерживает доступ к камере.');
            setCameraLoading(false);
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
                audio: false,
            });
            streamRef.current = stream;
            setCameraOpen(true);
            setCameraLoading(false);
        } catch (err: any) {
            setCameraLoading(false);
            const messages: Record<string, string> = {
                NotAllowedError: 'Нет доступа к камере. Разрешите доступ в настройках браузера.',
                NotFoundError: 'Камера не найдена. Проверьте подключение.',
                NotReadableError: 'Камера уже используется другим приложением.',
                NotSupportedError: 'Браузер не поддерживает доступ к камере.',
            };
            setCameraError(messages[err.name] || `Ошибка камеры: ${err.message}`);
            console.error('Camera error:', err);
        }
    }, []);

    const closeCamera = useCallback(() => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        setCameraOpen(false);
    }, []);

    // Attach stream to <video> once camera opens
    useEffect(() => {
        if (cameraOpen && videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
            videoRef.current.play().catch(console.error);
        }
        return () => {
            if (!cameraOpen) {
                streamRef.current?.getTracks().forEach(t => t.stop());
            }
        };
    }, [cameraOpen]);

    const takePhoto = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(blob => {
            if (!blob) return;
            const formData = new FormData();
            formData.append('images', blob, `camera_${Date.now()}.jpg`);
            upload.mutate(formData);
            closeCamera();
        }, 'image/jpeg', 0.92);
    }, [upload, closeCamera]);

    // ── File upload logic ──
    const handleFileSelect = (selected: FileList | null) => {
        if (!selected) return;
        const allowed = ['image/jpeg', 'image/png', 'image/jpg'];
        const valid = Array.from(selected).filter(f => allowed.includes(f.type));
        setFiles(prev => [...prev, ...valid]);
    };

    const removeFile = (idx: number) => {
        setFiles(prev => prev.filter((_, i) => i !== idx));
    };

    const onUpload = () => {
        if (!files.length) return;
        const formData = new FormData();
        formData.append('modelType', selectedModel!)
        files.forEach(f => formData.append('images', f));
        upload.mutate(formData);
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        handleFileSelect(e.dataTransfer.files);
    }, []);

    return (
        <>
            <h1 className="page-title">Загрузить документы</h1>

            {cameraError && (
                <div className="alert alert-error">⚠️ {cameraError}</div>
            )}

            <div className="upload-zone">
                <div className="upload-grid">
                    {/* Camera card */}
                    <div className="upload-card">
                        <p className="upload-card-title">📷 Камера</p>

                        {!cameraOpen ? (
                            <button
                                className="camera-trigger"
                                onClick={openCamera}
                                disabled={cameraLoading}
                            >
                                <div className="camera-trigger-icon">
                                    {cameraLoading ? <span className="spinner" /> : '📷'}
                                </div>
                                <span className="camera-trigger-label">
                                    {cameraLoading ? 'Инициализация...' : 'Открыть камеру'}
                                </span>
                                <span className="camera-trigger-sub">Сфотографировать документ</span>
                            </button>
                        ) : (
                            <div className="camera-view">
                                <div className="camera-video-container">
                                    <video
                                        ref={videoRef}
                                        className="camera-video"
                                        autoPlay
                                        playsInline
                                        muted
                                    />
                                    <div className="camera-viewfinder" />
                                </div>
                                <div className="camera-actions">
                                    <button className="btn btn-ghost btn-sm" onClick={closeCamera}>
                                        Закрыть
                                    </button>
                                    <button className="camera-shutter" onClick={takePhoto} title="Сделать снимок" />
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        Нажмите для снимка
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* File upload card */}
                    <div className="upload-card">
                        {/* Model selection dropdown */}
                        <div className="model-selector">
                            <label htmlFor="modelSelect" className="model-selector-label">
                                Модель распознавания:
                            </label>
                            {aiModelTypes.isSuccess && <select
                                id="modelSelect"
                                value={selectedModel}
                                onChange={(e) => setSelectedModel(e.target.value)}
                                className="model-select"
                                disabled={upload.isPending}
                                defaultValue={aiModelTypes.data[aiModelTypes.data.length - 1]}
                            >
                                {aiModelTypes.data.map(t => {
                                    return (<option key={t} value={t}>{t}</option>)
                                })}
                            </select>}
                        </div>

                        <p className="upload-card-title">📁 Файлы</p>
                        <div
                            key={uploaderKey}
                            className={`dropzone ${dragOver ? 'drag-over' : ''}`}
                            onDrop={handleDrop}
                            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/jpg"
                                multiple
                                onChange={e => handleFileSelect(e.target.files)}
                                style={{ display: 'none' }}
                            />
                            <span className="dropzone-icon">🗂️</span>
                            <div className="dropzone-text">
                                <strong>Перетащите файлы</strong> или кликните для выбора
                            </div>
                            <div className="dropzone-hint">JPG, JPEG, PNG</div>
                        </div>

                        {files.length > 0 && (
                            <div className="file-chips">
                                {files.map((f, i) => (
                                    <div key={i} className="file-chip">
                                        <span className="file-chip-name">{f.name}</span>
                                        <button
                                            className="file-chip-remove"
                                            onClick={e => { e.stopPropagation(); removeFile(i); }}
                                            title="Удалить"
                                        >✕</button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="upload-actions">
                            {files.length > 0 && (
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => setFiles([])}
                                >
                                    Очистить
                                </button>
                            )}
                            <button
                                className="btn btn-primary"
                                onClick={onUpload}
                                disabled={files.length === 0 || upload.isPending}
                            >
                                {upload.isPending
                                    ? <><span className="spinner" /> Обработка...</>
                                    : `Обработать${files.length > 0 ? ` (${files.length})` : ''}`
                                }
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <DocumentTable data={data!} title="История на сегодня" countPredictions={0}/>
        </>
    );
}
