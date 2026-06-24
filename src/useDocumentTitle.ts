import { useEffect } from 'react';

const useDocumentTitle = (title: string) => {
  useEffect(() => {
    document.title = `University Portal | ${title}`;
  }, [title]);
};

export default useDocumentTitle;
