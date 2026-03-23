window.initCareersResumeUpload = (fileInputId, maxSizeBytes) => {
    window.careersResumeUploadState = {
        fileName: "",
        contentType: "",
        base64: ""
    };

    const fileInput = document.getElementById(fileInputId);

    if (!fileInput) {
        return;
    }

    const allowedExtensions = [".pdf", ".doc", ".docx"];

    const clearResumeFields = () => {
        window.careersResumeUploadState = {
            fileName: "",
            contentType: "",
            base64: ""
        };
    };

    const getExtension = (fileName) => {
        const lastDotIndex = fileName.lastIndexOf(".");
        if (lastDotIndex < 0) {
            return "";
        }
        return fileName.substring(lastDotIndex).toLowerCase();
    };

    fileInput.addEventListener("change", async (event) => {
        const selectedFile = event.target.files && event.target.files[0];
        if (!selectedFile) {
            clearResumeFields();
            return;
        }

        const extension = getExtension(selectedFile.name);
        if (!allowedExtensions.includes(extension)) {
            clearResumeFields();
            event.target.value = "";
            return;
        }

        if (selectedFile.size > maxSizeBytes) {
            clearResumeFields();
            event.target.value = "";
            return;
        }

        try {
            const dataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(new Error("Failed to read file."));
                reader.readAsDataURL(selectedFile);
            });

            if (typeof dataUrl !== "string") {
                clearResumeFields();
                return;
            }

            const commaIndex = dataUrl.indexOf(",");
            if (commaIndex < 0) {
                clearResumeFields();
                return;
            }

            const base64Payload = dataUrl.substring(commaIndex + 1);
            window.careersResumeUploadState = {
                fileName: selectedFile.name,
                contentType: selectedFile.type || "",
                base64: base64Payload
            };
        } catch (error) {
            clearResumeFields();
            event.target.value = "";
            console.error("[CAREERS UPLOAD] Unable to process selected file.", error);
        }
    });
};

window.getCareersResumeUpload = () => {
    if (!window.careersResumeUploadState) {
        return {
            fileName: "",
            contentType: "",
            base64: ""
        };
    }

    return window.careersResumeUploadState;
};
