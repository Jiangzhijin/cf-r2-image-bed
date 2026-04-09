const { createApp, ref, onMounted } = Vue;

createApp({
    setup() {
        const isLoggedIn = ref(false);
        const authSecret = ref('');
        const loginError = ref('');
        const images = ref([]);
        const loading = ref(false);
        const toast = ref('');
        const showUploadModal = ref(false);
        const fileInput = ref(null);
        const isDragging = ref(false);
        const uploadQueue = ref([]);

        // 核心方法：构建 API 请求的 Headers (带上密钥)
        const getHeaders = () => {
            const secret = authSecret.ref || localStorage.getItem('r2_bed_secret');
            return {
                'X-Auth-Secret': secret
            };
        };

        const showToast = (msg) => {
            toast.value = msg;
            setTimeout(() => toast.value = '', 3000);
        };

        // 初始化
        onMounted(() => {
            const savedSecret = localStorage.getItem('r2_bed_secret');
            if (savedSecret) {
                authSecret.value = savedSecret;
                checkLogin(savedSecret);
            }
        });

        // 1. 登录
        const checkLogin = async (secret) => {
            try {
                const res = await fetch('/api/auth', { headers: { 'X-Auth-Secret': secret } });
                if (res.ok) {
                    isLoggedIn.value = true;
                    localStorage.setItem('r2_bed_secret', secret);
                    fetchImages(); // 登录成功后拉取图片
                } else {
                    localStorage.removeItem('r2_bed_secret');
                    isLoggedIn.value = false;
                    loginError.value = '密钥无效';
                }
            } catch (e) {
                loginError.value = '服务器连接失败';
            }
        };

        const login = () => {
            if (!authSecret.value) return;
            loginError.value = '';
            checkLogin(authSecret.value);
        };

        const logout = () => {
            localStorage.removeItem('r2_bed_secret');
            isLoggedIn.value = false;
            authSecret.value = '';
        };

        // 2. 获取图片列表
        const fetchImages = async () => {
            loading.value = true;
            try {
                const res = await fetch('/api/images', { headers: getHeaders() });
                if (res.ok) {
                    images.value = await res.json();
                } else {
                    showToast('获取列表失败');
                }
            } catch (e) {
                showToast('API 连接错误');
            }
            loading.value = false;
        };

        const getImageUrl = (key) => `/images/${key}`;

        // 3. 上传处理
        const openUploadModal = () => { showUploadModal.value = true; uploadQueue.value = []; };
        const closeUploadModal = () => { 
            showUploadModal.value = false; 
            if(uploadQueue.value.some(f => f.status === 'success')) fetchImages(); // 有成功上传，刷新列表
        };

        const triggerFileInput = () => fileInput.value.click();

        const onFileSelected = (e) => handleFiles(Array.from(e.target.files));

        // 核心：上传单个文件到后端
        const uploadFile = async (file) => {
            const queueItem = { name: file.name, status: 'uploading' };
            uploadQueue.value.push(queueItem);

            const formData = new FormData();
            formData.append('file', file);
            formData.append('filename', file.name);

            try {
                const res = await fetch('/api/upload', {
                    method: 'POST',
                    headers: getHeaders(),
                    body: formData
                });
                if (res.ok) {
                    queueItem.status = 'success';
                } else {
                    queueItem.status = 'error';
                }
            } catch (e) {
                queueItem.status = 'error';
            }
        };

        const handleFiles = (files) => {
            files.forEach(file => {
                if (!file.type.startsWith('image/')) return;
                if (file.size > 10 * 1024 * 1024) return showToast(`${file.name} 超过 10MB`);
                uploadFile(file);
            });
        };

        // 4. 删除图片
        const deleteImage = async (key) => {
            if (!confirm(`确定要永久删除 ${key} 吗？`)) return;
            try {
                const res = await fetch(`/api/images`, {
                    method: 'DELETE',
                    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key })
                });
                if (res.ok) {
                    showToast('删除成功');
                    fetchImages();
                } else {
                    showToast('删除失败');
                }
            } catch (e) {
                showToast('API 错误');
            }
        };

        // 5. 复制链接
        const copyLink = (key) => {
            const url = `${window.location.origin}/images/${key}`;
            navigator.clipboard.writeText(url).then(() => {
                showToast('链接已复制到剪贴板');
            });
        };

        // 拖拽相关逻辑
        const onDragOver = () => isDragging.value = true;
        const onDragLeave = () => isDragging.value = false;
        const onDrop = (e) => {
            isDragging.value = false;
            handleFiles(Array.from(e.dataTransfer.files));
        };

        return {
            isLoggedIn, authSecret, loginError, images, loading, toast, showUploadModal, fileInput, isDragging, uploadQueue,
            login, logout, getImageUrl, deleteImage, copyLink, fetchImages,
            openUploadModal, closeUploadModal, triggerFileInput, onFileSelected,
            onDragOver, onDragLeave, onDrop
        };
    }
}).mount('#app');