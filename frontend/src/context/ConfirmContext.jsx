import { createContext, useContext, useCallback, useRef, useState } from 'react';
import { FiAlertTriangle, FiHelpCircle } from 'react-icons/fi';

const ConfirmContext = createContext(null);

// Tự nhận biết hành động xóa (chứa "xóa"/"xoá") để tô nút xác nhận màu đỏ cảnh báo,
// còn lại (kết thúc, chuyển kỳ, hoàn tất...) dùng màu xanh mặc định — nhờ vậy các
// nơi gọi confirm() không cần truyền thêm option cho từng trường hợp.
const laHanhDongXoa = (message) => /xóa|xoá/i.test(message);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const resolveRef = useRef(null);

  const confirm = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({
        message,
        title: options.title,
        danger: options.danger ?? laHanhDongXoa(message),
        confirmText: options.confirmText || 'Đồng ý',
        cancelText: options.cancelText || 'Hủy',
      });
    });
  }, []);

  const handle = (result) => {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className="overlay" onClick={() => handle(false)}>
          <div className="modal modal--confirm fade-in" onClick={e => e.stopPropagation()}>
            <div className="confirm-body">
              <div className={`confirm-icon-wrap${state.danger ? ' confirm-icon-wrap--danger' : ' confirm-icon-wrap--info'}`}>
                {state.danger ? <FiAlertTriangle /> : <FiHelpCircle />}
              </div>
              <div>
                {state.title && <h3 className="confirm-title">{state.title}</h3>}
                <p className="confirm-message">{state.message}</p>
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '0 24px 20px' }}>
              <button type="button" className="btn-danger" onClick={() => handle(false)}>{state.cancelText}</button>
              <button type="button" className="btn-primary" onClick={() => handle(true)}>{state.confirmText}</button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm phải được dùng bên trong ConfirmProvider');
  return ctx;
}
