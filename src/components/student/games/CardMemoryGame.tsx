import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Shuffle, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';

interface MemoryCard {
  id: number;
  content: string;
  isFlipped: boolean;
  isMatched: boolean;
}

interface CardMemoryGameData {
  question: string;
  pairs: string[];
  hint?: string;
}

interface CardMemoryGameProps {
  gameData: CardMemoryGameData;
  onCorrect: () => void;
  onWrong: () => void;
  onComplete: () => void;
}

export const CardMemoryGame = ({ gameData, onCorrect, onWrong, onComplete }: CardMemoryGameProps) => {
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [matches, setMatches] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);

  useEffect(() => {
    initializeGame();
  }, [gameData]);

  const initializeGame = () => {
    // Create pairs of cards
    const cardPairs: string[] = [];
    gameData.pairs.forEach(pair => {
      cardPairs.push(pair, pair); // Add each pair twice
    });

    // Shuffle cards
    const shuffled = cardPairs
      .map((content, index) => ({
        id: index,
        content,
        isFlipped: false,
        isMatched: false,
      }))
      .sort(() => Math.random() - 0.5);

    setCards(shuffled);
    setFlippedCards([]);
    setAttempts(0);
    setMatches(0);
    setGameCompleted(false);
  };

  const handleCardClick = (cardId: number) => {
    if (gameCompleted) return;
    if (flippedCards.length === 2) return;
    if (flippedCards.includes(cardId)) return;
    if (cards[cardId].isMatched) return;

    const newFlippedCards = [...flippedCards, cardId];
    setFlippedCards(newFlippedCards);

    // Flip the card
    setCards(prevCards =>
      prevCards.map(card =>
        card.id === cardId ? { ...card, isFlipped: true } : card
      )
    );

    // Check for match when two cards are flipped
    if (newFlippedCards.length === 2) {
      setAttempts(prev => prev + 1);
      const [firstId, secondId] = newFlippedCards;
      const firstCard = cards[firstId];
      const secondCard = cards[secondId];

      if (firstCard.content === secondCard.content) {
        // Match found!
        setTimeout(() => {
          setCards(prevCards =>
            prevCards.map(card =>
              card.id === firstId || card.id === secondId
                ? { ...card, isMatched: true }
                : card
            )
          );
          setMatches(prev => {
            const newMatches = prev + 1;
            if (newMatches === gameData.pairs.length) {
              // Game completed!
              confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
              setGameCompleted(true);
              onCorrect();
              setTimeout(() => onComplete(), 1500);
            }
            return newMatches;
          });
          setFlippedCards([]);
        }, 500);
      } else {
        // No match
        onWrong();
        setTimeout(() => {
          setCards(prevCards =>
            prevCards.map(card =>
              card.id === firstId || card.id === secondId
                ? { ...card, isFlipped: false }
                : card
            )
          );
          setFlippedCards([]);
        }, 1000);
      }
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">{gameData.question}</h3>
          <p className="text-sm text-muted-foreground">
            Find all matching pairs • Attempts: {attempts} • Matches: {matches}/{gameData.pairs.length}
          </p>
        </div>
        <div className="flex gap-2">
          {gameData.hint && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHint(!showHint)}
            >
              {showHint ? 'Hide' : 'Show'} Hint
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={initializeGame}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      {showHint && gameData.hint && (
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <p className="text-sm">💡 {gameData.hint}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-4 gap-4 max-w-4xl mx-auto">
        {cards.map((card) => (
          <Card
            key={card.id}
            className={`cursor-pointer aspect-square transition-all duration-300 ${
              card.isFlipped || card.isMatched
                ? 'bg-primary text-primary-foreground'
                : 'bg-card hover:bg-accent'
            } ${card.isMatched ? 'opacity-50' : ''}`}
            onClick={() => handleCardClick(card.id)}
          >
            <CardContent className="p-0 h-full flex items-center justify-center">
              <div className="text-center p-2">
                {card.isFlipped || card.isMatched ? (
                  <span className="text-sm font-medium">{card.content}</span>
                ) : (
                  <div className="text-4xl">🎴</div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {gameCompleted && (
        <div className="text-center space-y-2">
          <p className="text-xl font-semibold text-primary">
            🎉 Congratulations! You matched all pairs!
          </p>
          <p className="text-sm text-muted-foreground">
            Completed in {attempts} attempts
          </p>
        </div>
      )}
    </div>
  );
};
