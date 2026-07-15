export default function ShareSheet({ item, onClose, onToast }) {
  const source = item.sources.find((s) => s.url && s.url !== "#");
  const shareUrl = source?.url || window.location.href;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      onToast("Link copied to clipboard");
    } catch {
      onToast("Couldn't copy link");
    }
    onClose();
  };

  const openMessage = () => {
    window.open(`sms:&body=${encodeURIComponent(`${item.title} — ${shareUrl}`)}`, "_blank");
    onClose();
  };

  const openEmail = () => {
    window.open(`mailto:?subject=${encodeURIComponent(item.title)}&body=${encodeURIComponent(shareUrl)}`, "_blank");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-[20px] p-2 pb-4 animate-[slide-up_0.2s_ease-out]">
        <div className="w-10 h-1 rounded-full bg-border mx-auto my-2" />
        <SheetRow label="Copy Link" onClick={copyLink} />
        <SheetRow label="Message" onClick={openMessage} />
        <SheetRow label="Email" onClick={openEmail} />
        <div className="h-px bg-border-soft my-1" />
        <SheetRow label="Cancel" onClick={onClose} muted />
      </div>
    </div>
  );
}

function SheetRow({ label, onClick, muted }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-center py-3.5 text-[15px] font-heading font-semibold rounded-[12px] ${
        muted ? "text-text-secondary" : "text-navy"
      }`}
    >
      {label}
    </button>
  );
}
