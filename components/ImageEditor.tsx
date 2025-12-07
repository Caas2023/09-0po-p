import React, { useState, useRef, useEffect } from 'react';
import { Wand2, Upload, Download, X, Loader2, Image as ImageIcon, Check, Undo, Redo, History } from 'lucide-react';
import { editImageWithGemini } from '../services/geminiService';

interface ImageEditorProps {
  onClose?: () => void;
}

export const ImageEditor: React.FC<ImageEditorProps> = ({ onClose }) => {
  // State for history management
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Current viewing state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Generation state
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync selected image with history navigation
  useEffect(() => {
    if (historyIndex >= 0 && history[historyIndex]) {
      setSelectedImage(history[historyIndex]);
    } else {
      setSelectedImage(null);
    }
  }, [historyIndex, history]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Reset history with new file
        setHistory([result]);
        setHistoryIndex(0);
        setGeneratedImage(null);
        setError(null);
        setPrompt('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!selectedImage || !prompt) return;

    setLoading(true);
    setError(null);

    try {
      // Always use the currently selected image (from history) as the source
      const imageToProcess = selectedImage; 
      
      const result = await editImageWithGemini(imageToProcess, prompt);
      setGeneratedImage(result);
    } catch (err) {
      setError('Falha ao gerar imagem. Tente novamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (generatedImage) {
      // Create new history branch
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(generatedImage);
      
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      
      // Reset generation state to allow next edit
      setGeneratedImage(null);
      setPrompt('');
    }
  };

  const handleDiscard = () => {
    setGeneratedImage(null);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setGeneratedImage(null);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setGeneratedImage(null);
    }
  };

  const handleClear = () => {
    if(confirm('Isso apagará todo o seu progresso atual. Continuar?')) {
        setHistory([]);
        setHistoryIndex(-1);
        setGeneratedImage(null);
        setPrompt('');
        setError(null);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 h-full flex flex-col animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Wand2 className="text-purple-600" />
            AI Studio de Imagem
          </h2>
          <p className="text-slate-500 text-sm mt-1">Edite fotos sequencialmente usando Gemini Nano Banana</p>
        </div>
        <div className="flex items-center gap-2">
            {history.length > 0 && (
                <div className="flex bg-slate-100 rounded-lg p-1 mr-4">
                    <button 
                        onClick={handleUndo} 
                        disabled={historyIndex <= 0 || loading}
                        className="p-2 hover:bg-white hover:shadow-sm rounded-md disabled:opacity-30 transition-all text-slate-600"
                        title="Desfazer"
                    >
                        <Undo size={18} />
                    </button>
                    <button 
                        onClick={handleRedo} 
                        disabled={historyIndex >= history.length - 1 || loading}
                        className="p-2 hover:bg-white hover:shadow-sm rounded-md disabled:opacity-30 transition-all text-slate-600"
                        title="Refazer"
                    >
                        <Redo size={18} />
                    </button>
                </div>
            )}
            {onClose && (
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                <X size={20} />
            </button>
            )}
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-8 min-h-0">
        {/* Left Panel: Controls & Preview */}
        <div className="flex-1 flex flex-col gap-4 relative">
          {!selectedImage ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors min-h-[300px]"
            >
              <div className="p-4 bg-blue-50 rounded-full text-blue-600 mb-4">
                <Upload size={32} />
              </div>
              <p className="font-medium text-slate-700">Clique para fazer upload</p>
              <p className="text-sm text-slate-400 mt-1">Suporta JPG, PNG</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileChange} 
              />
            </div>
          ) : (
            <div className="flex-1 relative bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center group border border-slate-200 shadow-inner">
               {/* Main Image Display */}
               <div className="relative w-full h-full flex items-center justify-center p-4">
                  <img 
                    src={selectedImage} 
                    alt="Current Source" 
                    className={`max-w-full max-h-[500px] object-contain transition-opacity duration-300 ${generatedImage ? 'opacity-20' : 'opacity-100'}`} 
                  />
                  {/* Overlay Generated Image for Preview */}
                  {generatedImage && (
                    <img 
                        src={generatedImage}
                        alt="Preview"
                        className="absolute inset-0 m-auto max-w-full max-h-[500px] object-contain z-10 shadow-2xl"
                    />
                  )}
               </div>

               {/* History Indicator */}
               <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2">
                    <History size={12} />
                    <span>Versão {historyIndex + 1} de {history.length}</span>
               </div>

               {/* Clear Button */}
               <button 
                onClick={handleClear}
                className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                title="Limpar tudo"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Controls Area */}
          <div className="space-y-4">
             {/* Prompt Input - Only visible when no pending result */}
             {!generatedImage && (
                 <div className="animate-fade-in">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Instrução para IA</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Ex: Adicionar óculos escuros, Deixar em preto e branco..."
                            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                            disabled={!selectedImage || loading}
                            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                        />
                        <button
                            onClick={handleGenerate}
                            disabled={!selectedImage || !prompt || loading}
                            className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : <Wand2 size={18} />}
                            Gerar
                        </button>
                    </div>
                 </div>
             )}

             {/* Review Controls - Only visible when there is a result */}
             {generatedImage && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 animate-slide-up flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-purple-100 p-2 rounded-full text-purple-600">
                            <Wand2 size={20} />
                        </div>
                        <div>
                            <p className="font-bold text-slate-800">Resultado Gerado</p>
                            <p className="text-xs text-slate-500">Deseja aplicar esta edição?</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={handleDiscard}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            <X size={18} />
                            Descartar
                        </button>
                        <button 
                            onClick={handleApply}
                            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-colors flex items-center gap-2 shadow-sm"
                        >
                            <Check size={18} />
                            Aplicar Edição
                        </button>
                    </div>
                </div>
             )}

             {error && (
                 <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg animate-fade-in border border-red-100">
                     {error}
                 </div>
             )}
          </div>
        </div>

        {/* Right Panel: Info & Download (Collapsed if no image, or simplified) */}
        {selectedImage && (
           <div className="lg:w-64 flex flex-col gap-4 border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-6">
              <div>
                  <h3 className="font-bold text-slate-800 mb-1">Detalhes</h3>
                  <p className="text-sm text-slate-500">Use a barra de prompt para adicionar ou remover elementos da imagem sequencialmente.</p>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700 border border-blue-100">
                  <p className="font-semibold mb-1">Dica:</p>
                  <p>Cada vez que você clica em "Aplicar", a imagem gerada se torna a nova base para a próxima instrução.</p>
              </div>

              <div className="mt-auto">
                  <a 
                    href={selectedImage} 
                    download={`edited-image-v${historyIndex + 1}.png`}
                    className="w-full bg-slate-800 hover:bg-slate-900 text-white px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                      <Download size={18} />
                      Baixar Atual
                  </a>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};
