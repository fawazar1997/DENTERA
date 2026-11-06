// Browser side of a Google Drive upload: the server starts a resumable
// session, and the browser sends the file straight to it.

/** Sends a file to a Google upload session, reporting progress; resolves with the file id. */
export function putToDrive(url: string, file: File, type: string, onProgress: (p: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", type);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      try {
        const id = JSON.parse(xhr.responseText)?.id;
        if (xhr.status >= 200 && xhr.status < 300 && id) resolve(id);
        else reject(new Error(`drive ${xhr.status}`));
      } catch {
        reject(new Error("drive response"));
      }
    };
    xhr.onerror = () => reject(new Error("network"));
    xhr.send(file);
  });
}
