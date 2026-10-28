import { useState, useEffect, useRef } from 'react';
import { Calculator, X, Delete, Copy, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

export function QuickCalculatorPopover() {
  const [isOpen, setIsOpen] = useState(false);
  const [display, setDisplay] = useState('0');
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [resetNext, setResetNext] = useState(false);
  const [copied, setCopied] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle keyboard inputs when popover is open
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      } else if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === '.' || e.key === ',') {
        handleDecimal();
      } else if (['+', '-', '*', '/'].includes(e.key)) {
        handleOperator(e.key);
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleEquals();
      } else if (e.key === 'Backspace') {
        handleBackspace();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, display, prevValue, operation, resetNext]);

  const handleDigit = (digit: string) => {
    if (display === '0' || resetNext) {
      setDisplay(digit);
      setResetNext(false);
    } else {
      if (display.length < 14) {
        setDisplay(display + digit);
      }
    }
  };

  const handleDecimal = () => {
    if (resetNext) {
      setDisplay('0.');
      setResetNext(false);
      return;
    }
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setPrevValue(null);
    setOperation(null);
    setResetNext(false);
  };

  const handleBackspace = () => {
    if (resetNext) {
      setDisplay('0');
      setResetNext(false);
      return;
    }
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  };

  const calculate = (a: number, b: number, op: string): number => {
    switch (op) {
      case '+':
        return a + b;
      case '-':
        return a - b;
      case '*':
        return a * b;
      case '/':
        return b !== 0 ? a / b : 0;
      default:
        return b;
    }
  };

  const handleOperator = (nextOp: string) => {
    const current = parseFloat(display);

    if (prevValue === null) {
      setPrevValue(current);
    } else if (operation && !resetNext) {
      const result = calculate(prevValue, current, operation);
      setPrevValue(result);
      setDisplay(String(Number(result.toFixed(6))));
    }

    setOperation(nextOp);
    setResetNext(true);
  };

  const handleEquals = () => {
    if (operation === null || prevValue === null) return;
    const current = parseFloat(display);
    const result = calculate(prevValue, current, operation);
    setDisplay(String(Number(result.toFixed(6))));
    setPrevValue(null);
    setOperation(null);
    setResetNext(true);
  };

  const handlePercent = () => {
    const current = parseFloat(display);
    if (prevValue !== null && operation) {
      const percentVal = (prevValue * current) / 100;
      setDisplay(String(Number(percentVal.toFixed(6))));
    } else {
      setDisplay(String(current / 100));
    }
  };

  const handleToggleSign = () => {
    const current = parseFloat(display);
    setDisplay(String(-current));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(display);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const opSymbols: Record<string, string> = {
    '+': '+',
    '-': '−',
    '*': '×',
    '/': '÷',
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors',
          isOpen && 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400'
        )}
        title="Calculadora rápida de faena y cubicación"
        aria-label="Abrir calculadora rápida"
      >
        <Calculator size={18} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
              <Calculator size={14} className="text-blue-600 dark:text-blue-400" />
              <span>Calculadora Rápida</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleCopy}
                className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                title="Copiar resultado"
              >
                {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Display */}
          <div className="bg-slate-50 dark:bg-slate-950/80 rounded-xl p-2.5 mb-3 border border-slate-200 dark:border-slate-800 text-right">
            <div className="text-[10px] text-slate-400 h-4 font-mono">
              {prevValue !== null && operation ? `${prevValue} ${opSymbols[operation] || operation}` : ''}
            </div>
            <div className="text-xl font-bold font-mono tracking-tight text-slate-900 dark:text-white truncate">
              {display}
            </div>
          </div>

          {/* Keypad Grid */}
          <div className="grid grid-cols-4 gap-1.5 text-xs">
            {/* Row 1 */}
            <button
              onClick={handleClear}
              className="py-2 rounded-lg font-bold bg-slate-100 dark:bg-slate-800 text-red-600 dark:text-red-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              C
            </button>
            <button
              onClick={handleToggleSign}
              className="py-2 rounded-lg font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              ±
            </button>
            <button
              onClick={handlePercent}
              className="py-2 rounded-lg font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              %
            </button>
            <button
              onClick={() => handleOperator('/')}
              className={cn(
                'py-2 rounded-lg font-bold transition',
                operation === '/'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60'
              )}
            >
              ÷
            </button>

            {/* Row 2 */}
            <button
              onClick={() => handleDigit('7')}
              className="py-2 rounded-lg font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              7
            </button>
            <button
              onClick={() => handleDigit('8')}
              className="py-2 rounded-lg font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              8
            </button>
            <button
              onClick={() => handleDigit('9')}
              className="py-2 rounded-lg font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              9
            </button>
            <button
              onClick={() => handleOperator('*')}
              className={cn(
                'py-2 rounded-lg font-bold transition',
                operation === '*'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60'
              )}
            >
              ×
            </button>

            {/* Row 3 */}
            <button
              onClick={() => handleDigit('4')}
              className="py-2 rounded-lg font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              4
            </button>
            <button
              onClick={() => handleDigit('5')}
              className="py-2 rounded-lg font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              5
            </button>
            <button
              onClick={() => handleDigit('6')}
              className="py-2 rounded-lg font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              6
            </button>
            <button
              onClick={() => handleOperator('-')}
              className={cn(
                'py-2 rounded-lg font-bold transition',
                operation === '-'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60'
              )}
            >
              −
            </button>

            {/* Row 4 */}
            <button
              onClick={() => handleDigit('1')}
              className="py-2 rounded-lg font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              1
            </button>
            <button
              onClick={() => handleDigit('2')}
              className="py-2 rounded-lg font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              2
            </button>
            <button
              onClick={() => handleDigit('3')}
              className="py-2 rounded-lg font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              3
            </button>
            <button
              onClick={() => handleOperator('+')}
              className={cn(
                'py-2 rounded-lg font-bold transition',
                operation === '+'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60'
              )}
            >
              +
            </button>

            {/* Row 5 */}
            <button
              onClick={() => handleDigit('0')}
              className="py-2 rounded-lg font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition col-span-1"
            >
              0
            </button>
            <button
              onClick={handleDecimal}
              className="py-2 rounded-lg font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              .
            </button>
            <button
              onClick={handleBackspace}
              className="py-2 rounded-lg font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center justify-center"
              title="Borrar último dígito"
            >
              <Delete size={14} />
            </button>
            <button
              onClick={handleEquals}
              className="py-2 rounded-lg font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition"
            >
              =
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
