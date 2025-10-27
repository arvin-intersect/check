// FINAL CODE: REPLACE this file at src/components/layout/UserMenu.tsx

import { UserButton, useUser } from "@clerk/clerk-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { fetchWithAuth } from "@/lib/apiClient";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Link2, Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider, // Ensure TooltipProvider is imported
  TooltipTrigger,
} from "@/components/ui/tooltip";


// This is a new component to handle the Miro connection logic
const MiroConnect = () => {
    const { user } = useUser();
    const { getToken } = useAuth();
    const queryClient = useQueryClient();

    // Query to check if the user's Miro account is connected
    const { data: miroStatus, isLoading } = useQuery({
        queryKey: ['miroConnectionStatus'],
        queryFn: async () => {
            // This endpoint is defined in your modified api/health.ts
            return fetchWithAuth('/api/health?action=check_miro_status', {}, getToken);
        },
        enabled: !!user, // Only run this query if the user is logged in
    });

    const handleConnectMiro = () => {
        if (!user) return;
        const authUrl = `/api/health?action=miro_auth&userId=${user.id}`;
        const authWindow = window.open(authUrl, 'MiroAuth', 'width=600,height=700,popup');
        
        // After the popup closes, refetch the connection status to update the UI
        const checkWindow = setInterval(() => {
            if (authWindow?.closed) {
                clearInterval(checkWindow);
                toast.info("Checking Miro connection...");
                queryClient.invalidateQueries({ queryKey: ['miroConnectionStatus'] });
            }
        }, 500);
    };

    if (isLoading) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" disabled>
                        <Loader2 className="h-4 w-4 animate-spin" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Checking Miro Connection...</p>
                </TooltipContent>
            </Tooltip>
        );
    }
    
    if (miroStatus?.isConnected) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex items-center justify-center h-10 w-10">
                        <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" title="Miro Connected"></span>
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Miro Account Connected</p>
                </TooltipContent>
            </Tooltip>
        );
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleConnectMiro}>
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                </Button>
            </TooltipTrigger>
            <TooltipContent>
                <p>Connect to Miro</p>
            </TooltipContent>
        </Tooltip>
    );
};


export const UserMenu = () => {
  return (
    <div className="flex items-center gap-4">
        {/* The TooltipProvider is needed for the tooltips inside MiroConnect to work */}
        <TooltipProvider>
            <MiroConnect />
        </TooltipProvider>
        <UserButton afterSignOutUrl="/"/>
    </div>
  );
};