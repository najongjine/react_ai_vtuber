export const fetchChatResponse = async (
    backendUrl: string,
    prompt: string,
    sessionId: string,
    images: File[]
): Promise<Response> => {
    const formData = new FormData();
    formData.append("question", prompt);
    formData.append("session_id", sessionId);

    if (images.length > 0) {
        images.forEach((file) => {
            formData.append("file", file);
        });
    }

    const response = await fetch(backendUrl, {
        method: "POST",
        body: formData,
    });

    if (!response.body) {
        throw new Error("ReadableStream not supported in this browser.");
    }

    return response;
};

export interface TagParseResult {
    cleanedText: string;
    tags: string[];
}

export const parseTags = (text: string): TagParseResult => {
    const tagRegex = /\[\[(.*?)\]\]/g;
    const tags: string[] = [];
    let cleanedText = text;
    let match;

    while ((match = tagRegex.exec(text)) !== null) {
        tags.push(match[1]);
        cleanedText = cleanedText.replace(match[0], "");
    }

    return { cleanedText, tags };
};
