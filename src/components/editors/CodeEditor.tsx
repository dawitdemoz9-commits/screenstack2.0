'use client';

import Editor from '@monaco-editor/react';

interface Props {
  language: string;
  value: string;
  onChange: (value: string) => void;
  height?: string;
  readOnly?: boolean;
}

export default function CodeEditor({ language, value, onChange, height = '300px', readOnly = false }: Props) {
  return (
    <div className="rounded-lg overflow-hidden border border-gray-300">
      <div className="bg-gray-800 px-3 py-1.5 flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-red-500" />
        <div className="w-3 h-3 rounded-full bg-yellow-500" />
        <div className="w-3 h-3 rounded-full bg-green-500" />
        <span className="text-gray-400 text-xs ml-2 font-mono">{language}</span>
      </div>
      <Editor
        height={height}
        language={language}
        value={value}
        onChange={(v) => onChange(v || '')}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          readOnly,
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          tabSize: 2,
          automaticLayout: true,
          fontFamily: 'JetBrains Mono, Fira Code, monospace',
        }}
      />
    </div>
  );
}
