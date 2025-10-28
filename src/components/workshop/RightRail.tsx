// src/components/workshop/RightRail.tsx

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Link2, Trash2 } from "lucide-react";

export const RightRail = ({ cartItems, onRemoveFromCart, onExport }) => {
    return (
        <aside className="w-96 border-l bg-card flex flex-col h-full">
            <div className="p-4 border-b">
                <h3 className="font-semibold text-lg">Workshop Cart ({cartItems.length})</h3>
                <p className="text-sm text-muted-foreground">Curated insights for export.</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {cartItems.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                        <p>Add insights from the left to build your workshop.</p>
                    </div>
                ) : (
                    cartItems.map(item => (
                        <Card key={item.id} className="p-3">
                            <div className="flex justify-between items-start">
                                <p className="text-xs font-medium line-clamp-2 pr-2">{item.aiHeading}</p>
                                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => onRemoveFromCart(item.id)}>
                                    <Trash2 className="h-3 w-3"/>
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-3 mt-1">{item.aiSummary}</p>
                        </Card>
                    ))
                )}
            </div>
            
            <div className="p-4 border-t mt-auto bg-background">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2"><Link2 className="h-4 w-4"/> Miro Export</CardTitle>
                        <CardDescription className="text-xs">Send your curated insights to a Miro board.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button className="w-full gap-2" disabled={cartItems.length === 0} onClick={onExport}>
                            Send to Miro ({cartItems.length})
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </aside>
    );
};