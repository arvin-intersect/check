// src/components/workshop/RightRail.tsx

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Link2, Trash2, Sparkles } from "lucide-react"; // CORRECTED: Added Sparkles import
import type { Insight, WorkshopBoard } from "@/types";

interface RightRailProps {
  cartItems: Insight[];
  boards: WorkshopBoard[];
  onRemoveFromCart: (id: string) => void;
  onExport: () => void;
  isExporting: boolean;
}

export const RightRail = ({ cartItems, boards, onRemoveFromCart, onExport, isExporting }: RightRailProps) => {

    const getBoardName = (boardId?: string) => {
        if (!boardId) return "Uncategorized";
        return boards.find(b => b.id === boardId)?.name || "Uncategorized";
    }

    return (
        <aside className="w-96 border-l bg-card flex flex-col h-full">
            <div className="p-4 border-b">
                <h3 className="font-semibold text-lg">Workshop Cart ({cartItems.length})</h3>
                <p className="text-sm text-muted-foreground">Curated insights for export.</p>
            </div>
            
            <ScrollArea className="flex-1">
                <div className="p-4 space-y-3">
                    {cartItems.length === 0 ? (
                        <div className="flex items-center justify-center h-[50vh] text-center text-muted-foreground">
                            <p>Add insights from the left to build your workshop.</p>
                        </div>
                    ) : (
                        cartItems.map(item => (
                            <Card key={item.id} className="p-3 bg-muted/30">
                                <div className="flex justify-between items-start gap-2">
                                    <div className='flex-1'>
                                        <p className="text-xs font-semibold line-clamp-2">{item.aiHeading}</p>
                                        <Badge variant="outline" className="mt-1 text-xs">{getBoardName(item.boardCategory)}</Badge>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => onRemoveFromCart(item.id)}>
                                        <Trash2 className="h-3 w-3 text-muted-foreground"/>
                                    </Button>
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            </ScrollArea>
            
            <div className="p-4 border-t mt-auto bg-background/80 backdrop-blur-sm">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2"><Link2 className="h-4 w-4"/> Miro Export</CardTitle>
                        <CardDescription className="text-xs">Send your curated insights to a Miro board, organized by category.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button className="w-full gap-2" disabled={cartItems.length === 0 || isExporting} onClick={onExport}>
                            {isExporting ? <Sparkles className="mr-2 h-4 w-4 animate-spin"/> : <Link2 className="mr-2 h-4 w-4"/>}
                            Send to Miro ({cartItems.length})
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </aside>
    );
};