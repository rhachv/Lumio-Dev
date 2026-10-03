import { useEffect, useRef, useState } from 'react'
import { Button } from '../ui/FormControls'
import { Icon } from '../ui/Icon'
import { MAX_LIBRARY_IMAGE_BYTES, MAX_LIBRARY_IMAGE_EDGE, prepareLibraryScreenshot } from '../../services/libraryValidation'
import type { PreparedScreenshot } from '../../services/libraryValidation'

export function ImageUploader({ existingUrl, onSelect, onRemove, disabled = false }: {
  existingUrl: string | null; onSelect: (image: PreparedScreenshot, previewUrl: string) => void; onRemove: () => void; disabled?: boolean
}) {
  const input = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState('')
  useEffect(() => () => { if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview) }, [preview])
  async function choose(file?: File) {
    if (!file) return
    setError('')
    try {
      const prepared = await prepareLibraryScreenshot(file)
      const nextUrl = URL.createObjectURL(prepared.blob)
      setPreview(nextUrl); onSelect(prepared, nextUrl)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível preparar a imagem.') }
  }
  const shownUrl = preview ?? existingUrl
  return <div className="library-image-uploader">
    <label htmlFor="library-screenshot">Screenshot ou imagem</label>
    <input ref={input} id="library-screenshot" className="sr-only" type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" disabled={disabled} onChange={(event) => { void choose(event.target.files?.[0]); event.target.value = '' }} />
    {shownUrl ? <div className="library-image-preview"><img src={shownUrl} alt="Prévia do screenshot selecionado" /><div><span>PNG, JPG ou WEBP · máximo {MAX_LIBRARY_IMAGE_BYTES / 1024 / 1024} MB · até {MAX_LIBRARY_IMAGE_EDGE}px</span><div><Button onClick={() => input.current?.click()} disabled={disabled}><Icon name="upload" />Substituir imagem</Button><Button onClick={() => { if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview); setPreview(null); onRemove() }} disabled={disabled}>Remover imagem</Button></div></div></div> : <button type="button" className="library-image-empty" onClick={() => input.current?.click()} disabled={disabled}><Icon name="upload" /><strong>Adicionar screenshot</strong><span>PNG, JPG ou WEBP · até 10 MB</span></button>}
    {error && <span className="field-error" role="alert">{error}</span>}
    <span className="field-hint">A imagem é redimensionada no navegador para no máximo 1.600 px e guardada num bucket privado.</span>
  </div>
}
