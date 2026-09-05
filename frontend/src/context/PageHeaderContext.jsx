import { createContext, useContext, useEffect, useState } from 'react';

const PageHeaderContext = createContext(null);

export const TIEU_DE_MAC_DINH = 'HỆ THỐNG QUẢN LÝ VŨ KHÍ TRANG BỊ';

export function PageHeaderProvider({ children }) {
  const [title, setTitle] = useState(TIEU_DE_MAC_DINH);
  return (
    <PageHeaderContext.Provider value={{ title, setTitle }}>
      {children}
    </PageHeaderContext.Provider>
  );
}

export function useHeaderTitle() {
  const ctx = useContext(PageHeaderContext);
  return ctx ? ctx.title : TIEU_DE_MAC_DINH;
}

// Mỗi trang gọi hook này để hiển thị tên trang ở thanh header trên cùng, thay cho tên hệ thống
// tĩnh — không cần khôi phục lại khi rời trang vì trang kế tiếp luôn tự đặt tiêu đề của nó.
export function usePageTitle(title) {
  const ctx = useContext(PageHeaderContext);
  useEffect(() => {
    if (ctx && title) ctx.setTitle(title);
  }, [ctx, title]);
}
