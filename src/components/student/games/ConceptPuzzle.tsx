import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';

interface Word {
  word: string;
  clue: string;
  start: { row: number; col: number };
  direction: 'across' | 'down';
}

interface ConceptPuzzleData {
  grid_size: { rows: number; cols: number };
  words: Word[];
}

interface ConceptPuzzleProps {
  gameData: ConceptPuzzleData;
  onCorrect: () => void;
  onWrong: () => void;
  onComplete: () => void;
}

interface Cell {
  letter: string;
  userInput: string;
  isPartOfWord: boolean;
  number?: number;
}

export const ConceptPuzzle = ({ gameData, onCorrect, onWrong, onComplete }: ConceptPuzzleProps) => {
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [selectedDirection, setSelectedDirection] = useState<'across' | 'down'>('across');
  const [checked, setChecked] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[][]>([]);

  useEffect(() => {
    initializeGrid();
  }, [gameData]);

  const initializeGrid = () => {
    const { rows, cols } = gameData.grid_size;
    const newGrid: Cell[][] = Array(rows).fill(null).map(() =>
      Array(cols).fill(null).map(() => ({
        letter: '',
        userInput: '',
        isPartOfWord: false,
      }))
    );

    // Initialize refs
    inputRefs.current = Array(rows).fill(null).map(() => Array(cols).fill(null));

    // Place words and assign numbers
    let wordNumber = 1;
    gameData.words.forEach(word => {
      const { start, direction } = word;
      
      // Assign number to first cell of word
      if (!newGrid[start.row][start.col].number) {
        newGrid[start.row][start.col].number = wordNumber++;
      }

      word.word.split('').forEach((letter, index) => {
        const row = direction === 'down' ? start.row + index : start.row;
        const col = direction === 'across' ? start.col + index : start.col;
        
        if (row < rows && col < cols) {
          newGrid[row][col].letter = letter;
          newGrid[row][col].isPartOfWord = true;
        }
      });
    });

    setGrid(newGrid);
  };

  const handleCellClick = (row: number, col: number) => {
    if (!grid[row][col].isPartOfWord) return;
    
    setSelectedCell({ row, col });
    inputRefs.current[row][col]?.focus();
    
    // Toggle direction if clicking same cell
    if (selectedCell?.row === row && selectedCell?.col === col) {
      setSelectedDirection(prev => prev === 'across' ? 'down' : 'across');
    }
  };

  const handleInputChange = (row: number, col: number, value: string) => {
    if (value.length > 1) return;
    
    const newGrid = [...grid];
    newGrid[row][col].userInput = value.toUpperCase();
    setGrid(newGrid);
    setChecked(false);

    // Move to next cell
    if (value) {
      const nextCell = getNextCell(row, col);
      if (nextCell) {
        setSelectedCell(nextCell);
        inputRefs.current[nextCell.row][nextCell.col]?.focus();
      }
    }
  };

  const getNextCell = (row: number, col: number): { row: number; col: number } | null => {
    const { rows, cols } = gameData.grid_size;
    
    if (selectedDirection === 'across') {
      const nextCol = col + 1;
      if (nextCol < cols && grid[row][nextCol].isPartOfWord) {
        return { row, col: nextCol };
      }
    } else {
      const nextRow = row + 1;
      if (nextRow < rows && grid[nextRow][col].isPartOfWord) {
        return { row: nextRow, col };
      }
    }
    return null;
  };

  const handleKeyDown = (e: React.KeyboardEvent, row: number, col: number) => {
    const { rows, cols } = gameData.grid_size;

    switch (e.key) {
      case 'ArrowRight':
        if (col + 1 < cols && grid[row][col + 1].isPartOfWord) {
          handleCellClick(row, col + 1);
        }
        break;
      case 'ArrowLeft':
        if (col - 1 >= 0 && grid[row][col - 1].isPartOfWord) {
          handleCellClick(row, col - 1);
        }
        break;
      case 'ArrowDown':
        if (row + 1 < rows && grid[row + 1][col].isPartOfWord) {
          handleCellClick(row + 1, col);
        }
        break;
      case 'ArrowUp':
        if (row - 1 >= 0 && grid[row - 1][col].isPartOfWord) {
          handleCellClick(row - 1, col);
        }
        break;
      case 'Backspace':
        if (!grid[row][col].userInput && selectedDirection === 'across' && col > 0) {
          handleCellClick(row, col - 1);
        } else if (!grid[row][col].userInput && selectedDirection === 'down' && row > 0) {
          handleCellClick(row - 1, col);
        }
        break;
    }
  };

  const handleCheck = () => {
    let allCorrect = true;
    
    grid.forEach((row, rowIdx) => {
      row.forEach((cell, colIdx) => {
        if (cell.isPartOfWord && cell.userInput !== cell.letter) {
          allCorrect = false;
        }
      });
    });

    setChecked(true);

    if (allCorrect) {
      onCorrect();
      setTimeout(() => onComplete(), 2000);
    } else {
      onWrong();
    }
  };

  const isComplete = grid.every(row => 
    row.every(cell => !cell.isPartOfWord || cell.userInput)
  );

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Puzzle Grid */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="inline-block">
              {grid.map((row, rowIdx) => (
                <div key={rowIdx} className="flex">
                  {row.map((cell, colIdx) => (
                    <div
                      key={colIdx}
                      className={`relative w-12 h-12 border ${
                        cell.isPartOfWord
                          ? 'bg-background cursor-pointer'
                          : 'bg-muted/30 border-muted'
                      } ${
                        selectedCell?.row === rowIdx && selectedCell?.col === colIdx
                          ? 'ring-2 ring-primary'
                          : ''
                      } ${
                        checked && cell.isPartOfWord && cell.userInput !== cell.letter
                          ? 'bg-destructive/20'
                          : checked && cell.isPartOfWord && cell.userInput === cell.letter
                          ? 'bg-primary/20'
                          : ''
                      }`}
                      onClick={() => handleCellClick(rowIdx, colIdx)}
                    >
                      {cell.number && (
                        <span className="absolute top-0.5 left-0.5 text-[10px] font-bold text-muted-foreground">
                          {cell.number}
                        </span>
                      )}
                      {cell.isPartOfWord && (
                        <input
                          ref={el => inputRefs.current[rowIdx][colIdx] = el}
                          type="text"
                          maxLength={1}
                          value={cell.userInput}
                          onChange={(e) => handleInputChange(rowIdx, colIdx, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, rowIdx, colIdx)}
                          className="w-full h-full text-center text-lg font-bold bg-transparent border-none outline-none uppercase"
                        />
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </Card>

          <Button
            onClick={handleCheck}
            className="w-full mt-4"
            disabled={!isComplete}
          >
            {checked ? (isComplete ? 'Check Again' : 'Try Again') : 'Check Puzzle'}
          </Button>
        </div>

        {/* Clues Panel */}
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="font-bold mb-3">Across</h3>
            <div className="space-y-2">
              {gameData.words
                .filter(w => w.direction === 'across')
                .map((word, idx) => {
                  const cellNumber = grid[word.start.row]?.[word.start.col]?.number;
                  return (
                    <div key={idx} className="text-sm">
                      <span className="font-semibold">{cellNumber}.</span> {word.clue}
                    </div>
                  );
                })}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-bold mb-3">Down</h3>
            <div className="space-y-2">
              {gameData.words
                .filter(w => w.direction === 'down')
                .map((word, idx) => {
                  const cellNumber = grid[word.start.row]?.[word.start.col]?.number;
                  return (
                    <div key={idx} className="text-sm">
                      <span className="font-semibold">{cellNumber}.</span> {word.clue}
                    </div>
                  );
                })}
            </div>
          </Card>
        </div>
      </div>

      {/* Success Message */}
      {checked && isComplete && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-6 bg-primary/10 border border-primary rounded-lg text-center"
        >
          <Check className="w-12 h-12 text-primary mx-auto mb-2" />
          <p className="text-lg font-semibold">Puzzle Complete!</p>
        </motion.div>
      )}
    </div>
  );
};
