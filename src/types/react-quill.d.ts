declare module 'react-quill' {
  import React from 'react';
  
  interface ReactQuillProps {
    value: string;
    onChange: (value: string) => void;
    theme?: string;
    modules?: any;
    formats?: string[];
    placeholder?: string;
    readOnly?: boolean;
    onError?: () => void;
    ref?: React.Ref<any>;
  }
  
  const ReactQuill: React.FC<ReactQuillProps>;
  
  export default ReactQuill;
}

declare module 'react-quill/dist/quill.snow.css'; 