import { closeTossView } from "../toss";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ExitModal({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div style={overlay} onClick={onClose}>
      <div style={panel} onClick={(e) => e.stopPropagation()}>
        <p style={message}>욕바지를 종료할까요?</p>
        <div style={btnRow}>
          <button style={btnSecondary} onClick={onClose}>
            닫기
          </button>
          <button style={btnPrimary} onClick={() => closeTossView()}>
            종료하기
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

const message: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  color: "#191f28",
  marginBottom: 20,
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
};

const btnPrimary: React.CSSProperties = {
  flex: 1,
  padding: "12px 0",
  borderRadius: 12,
  background: "#3182f6",
  color: "#fff",
  fontSize: 15,
  fontWeight: 600,
};
