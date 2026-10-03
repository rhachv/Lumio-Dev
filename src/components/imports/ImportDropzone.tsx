import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { Icon } from '../ui/Icon'
import { MAX_IMPORT_FILE_BYTES } from '../../services/spreadsheetReader'

export function ImportDropzone({ onFile, busy }: { onFile: (file: File) => void; busy: boolean }) {
  const input = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) onFile(file)
    event.target.value = ''
  }
  function drop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault(); setDragging(false)
    const file = event.dataTransfer.files[0]
    if (file) onFile(file)
  }
  return <label className={`import-dropzone${dragging ? ' import-dropzone--active' : ''}${busy ? ' import-dropzone--busy' : ''}`}
    onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={drop}>
    <input ref={input} className="sr-only" type="file" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" onChange={choose} disabled={busy} />
    <span className="import-dropzone-icon"><Icon name="upload" /></span>
    <span className="import-dropzone-title">Arraste seu arquivo aqui</span>
    <span className="import-dropzone-separator">ou</span>
    <span className="button button--primary">Selecionar arquivo</span>
    <span className="import-dropzone-formats">Excel .xlsx ou CSV · até {MAX_IMPORT_FILE_BYTES / 1024 / 1024} MB · máximo de 2.000 linhas</span>
    {busy && <span className="import-dropzone-progress" role="status">Preparando leitura…</span>}
  </label>
}
