

interface Props {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ open, title, message, onConfirm, onCancel }: Props) {
  if (!open) return null;

  return (
    <div style={overlay} onClick={onCancel}>
      <div style={panel} onClick={(e) => e.stopPropagation()}>
        <h2 style={titleStyle}>{title}</h2>
        <p style={messageStyle}>{message}</p>
        <div style={btnRow}>
          <button style={btnSecondary} onClick={onCancel}>
            취소
          </button>
          <button style={btnPrimary} onClick={onConfirm}>
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
};

const panel: React.CSSProperties = {
  background: "#fff",
  borderRadius: 16,
  padding: "28px 24px 20px",
  width: "min(280px, 85vw)",
  textAlign: "center",
};

const titleStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  color: "#191f28",
  marginBottom: 12,
  marginTop: 0,
};

const messageStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 500,
  color: "#4e5968",
  marginBottom: 24,
  lineHeight: 1.5,
};

const btnRow: React.CSSProperties = {
  display: "flex",
  gap: 8,
};

const btnSecondary: React.CSSProperties = {
  flex: 1,
  padding: "12px 0",
  borderRadius: 12,
  background: "#f2f3f4",
  color: "#4e5968",
  fontSize: 15,
  fontWeight: 600,
  border: "none",
};

const btnPrimary: React.CSSProperties = {
  flex: 1,
  padding: "12px 0",
  borderRadius: 12,
  background: "#3182f6",
  color: "#fff",
  fontSize: 15,
  fontWeight: 600,
  border: "none",
};
