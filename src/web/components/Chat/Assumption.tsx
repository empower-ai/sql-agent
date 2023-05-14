import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import CodeMirror from '@uiw/react-codemirror';
import React, { useState, type FC } from 'react';
import ReactMarkdown from 'react-markdown';
import { markdown } from '@codemirror/lang-markdown';
import { EditorView } from '@codemirror/view';

interface Props {
  assumptions: string
  onUpdate: (assumptions: string) => Promise<void>
}

export const Assumption: FC<Props> = ({ assumptions, onUpdate }) => {
  if (!assumptions) {
    return <></>;
  }

  const [isEditing, setIsEditing] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [editedAssumptions, setEditedAssumptions] = useState(assumptions);

  return (
    <>
      {(!isEditing)
        ? <>
          <ReactMarkdown>
            {assumptions}
          </ReactMarkdown>
          Notice any problems with the assumptions? Click <button
            className="font-bold text-blue-400"
            onClick={() => { setIsEditing(true); }}
          > here</button > to update.
        </>
        : <>
          <CodeMirror
            className='text-xs'
            value={assumptions}
            onChange={a => { setEditedAssumptions(a); }}
            basicSetup={{
              lineNumbers: isEditing,
              foldGutter: false
            }}
            readOnly={isRunning}
            editable={!isRunning}
            theme={vscodeDark}
            extensions={[
              markdown(),
              EditorView.lineWrapping
            ]}
          />
          {(!isRunning)
            ? <div className="flex justify-center">
              <button className="px-1 text-blue-400 font-bold"
                onClick={async () => {
                  setIsRunning(true);
                  await onUpdate(editedAssumptions);
                  setIsEditing(false);
                  setIsRunning(false);
                }}
              >
                Update
              </button>
              |
              <button className="px-1 text-stone-400 font-bold"
                onClick={() => {
                  setIsEditing(false);
                  setIsRunning(false);
                }}
              >
                Cancel
              </button>
            </div>
            : <span>Updating...</span>
          }
        </>
      }
    </>
  )
};
