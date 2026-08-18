import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Upload, File as FileIcon, Link as LinkIcon } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'in review', label: 'In review' },
  { value: 'approved', label: 'Published' },
];

const EXT_TYPE_MAP = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  html: 'text/html',
  htm: 'text/html',
};

// A pasted link with no recognized media extension — "https://www.zuper.co/"
// being the common case, a bare page URL rather than a direct file — used
// to come back `null` and render as an inert "file" placeholder with no
// actual preview. Defaulting to `text/html` treats it as a webpage to
// embed instead, which is what almost every extensionless link actually is.
function inferTypeFromUrl(url) {
  const clean = url.split('?')[0].split('#')[0];
  const ext = clean.split('.').pop()?.toLowerCase();
  return EXT_TYPE_MAP[ext] ?? 'text/html';
}

export default function CreateVersionModal({ suggestedLabel, onCreate, onClose }) {
  const [label, setLabel] = useState(suggestedLabel);
  const [description, setDescription] = useState('');
  const [changelog, setChangelog] = useState('');
  const [status, setStatus] = useState('draft');
  const [file, setFile] = useState(null);
  const [fileDataUrl, setFileDataUrl] = useState(null);
  const [link, setLink] = useState('');
  const fileInputRef = useRef(null);

  // A data URL (not URL.createObjectURL) so it survives being written to
  // localStorage and read back after a refresh — a blob URL would just be
  // a dead reference once the page reloads.
  const handleFileChange = (e) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (!f) {
      setFileDataUrl(null);
      return;
    }
    setLink('');
    const reader = new FileReader();
    reader.onload = () => setFileDataUrl(reader.result);
    reader.readAsDataURL(f);
  };

  const handleLinkChange = (e) => {
    setLink(e.target.value);
    if (e.target.value) {
      setFile(null);
      setFileDataUrl(null);
    }
  };

  // A prototype asset is mandatory — either an uploaded file or a pasted
  // link to hosted media (video, image, or a live HTML prototype).
  const hasAsset = Boolean(fileDataUrl || link.trim());
  const canSubmit = label.trim() && hasAsset;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    const trimmedLink = link.trim();
    onCreate({
      label: label.trim(),
      description: description.trim(),
      changelog: changelog.trim(),
      status,
      assetUrl: fileDataUrl || trimmedLink,
      assetName: file?.name ?? trimmedLink,
      assetType: file?.type ?? (trimmedLink ? inferTypeFromUrl(trimmedLink) : null),
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/15 p-6"
      onClick={onClose}
    >
      <motion.form
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="glass-surface w-[420px] max-h-[85vh] overflow-y-auto rounded-2xl p-5"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-[18px] font-semibold text-stone-800">New version</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-black/5 hover:text-stone-700"
          >
            <X size={15} strokeWidth={2} />
          </button>
        </div>

        <label className="mt-4 block text-[13px] font-medium text-stone-600">Version name</label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="v1.3"
          className="mt-1 w-full rounded-lg bg-black/5 px-3 py-2 text-[14.5px] text-stone-800 outline-none placeholder:text-stone-500 focus:bg-black/[0.07]"
        />

        <label className="mt-3 block text-[13px] font-medium text-stone-600">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this version?"
          rows={2}
          className="mt-1 w-full resize-none rounded-lg bg-black/5 px-3 py-2 text-[14.5px] text-stone-800 outline-none placeholder:text-stone-500 focus:bg-black/[0.07]"
        />

        <label className="mt-3 block text-[13px] font-medium text-stone-600">What changed</label>
        <textarea
          value={changelog}
          onChange={(e) => setChangelog(e.target.value)}
          placeholder="Summarize the changes since the last version"
          rows={2}
          className="mt-1 w-full resize-none rounded-lg bg-black/5 px-3 py-2 text-[14.5px] text-stone-800 outline-none placeholder:text-stone-500 focus:bg-black/[0.07]"
        />

        <label className="mt-3 block text-[13px] font-medium text-stone-600">Status</label>
        <div className="mt-1 flex items-center gap-1 rounded-lg bg-black/5 p-1">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatus(opt.value)}
              className={`flex-1 rounded-md py-1.5 text-[13.5px] font-medium transition-colors ${
                status === opt.value ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <label className="mt-3 block text-[13px] font-medium text-stone-600">
          Prototype asset <span className="text-red-500">*</span>
        </label>
        <input ref={fileInputRef} type="file" accept="image/*,video/*,.html,.htm" className="hidden" onChange={handleFileChange} />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mt-1 flex w-full items-center gap-2 rounded-lg border border-dashed border-stone-300 bg-black/[0.02] px-3 py-2.5 text-left text-[14px] text-stone-600 transition-colors hover:border-stone-400 hover:text-stone-800"
        >
          {file ? <FileIcon size={15} strokeWidth={2} /> : <Upload size={15} strokeWidth={2} />}
          {file ? file.name : 'Upload a file'}
        </button>

        <div className="my-2 flex items-center gap-2 text-[11.5px] text-stone-400">
          <div className="h-px flex-1 bg-stone-200" />
          or
          <div className="h-px flex-1 bg-stone-200" />
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-stone-200 bg-black/[0.02] px-3 py-2.5">
          <LinkIcon size={15} strokeWidth={2} className="flex-none text-stone-400" />
          <input
            type="url"
            value={link}
            onChange={handleLinkChange}
            placeholder="Paste a link — .mp4, .webm, .jpg, .png, .html…"
            className="w-full min-w-0 flex-1 bg-transparent text-[14px] text-stone-700 outline-none placeholder:text-stone-500"
          />
        </div>
        {!hasAsset && (
          <p className="mt-1.5 text-[12px] text-red-500">A file or a link is required to create a version.</p>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3.5 py-1.5 text-[14px] font-medium text-stone-600 transition-colors hover:bg-black/5"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-full bg-stone-800 px-4 py-1.5 text-[14px] font-medium text-white transition-opacity disabled:opacity-40"
          >
            Create version
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}
