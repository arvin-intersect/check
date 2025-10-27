// src/pages/QuestionnaireDetail.tsx - FIXED FOR /api/health

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft, Edit, Share2, Eye, Loader2, RefreshCw, FilePenLine, Link2 } from "lucide-react";
import { ShareDialog } from "@/components/questionnaire/ShareDialog";
import { EditQuestionnaireDialog } from "@/components/questionnaire/EditQuestionnaireDialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Questionnaire, Response as ResponseType, Section } from "@/types";
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from "@/lib/utils";
import { useAuth, useUser } from "@clerk/clerk-react";
import { fetchWithAuth } from "@/lib/apiClient";
import { toast } from "sonner";

const QuestionnaireDetail = () => {
  const { id: questionnaireId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [shareOpen, setShareOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { user } = useUser();

  // Listen for Miro auth success from popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'MIRO_AUTH_SUCCESS') {
        toast.success("Miro account connected!", {
          description: "You can now export responses to Miro boards."
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const fetchQuestionnaireAndResponses = async () => {
    if (!questionnaireId) throw new Error("No ID provided");
    const [questionnaireDetails, responsesData] = await Promise.all([
      fetchWithAuth(`/api/questionnaires/${questionnaireId}`, {}, getToken),
      fetchWithAuth(`/api/questionnaires/${questionnaireId}/responses`, {}, getToken)
    ]);
    const questionnaireStructure: Questionnaire = await fetch(`/api/questionnaires/${questionnaireId}/full`).then(res => res.json());
    
    const finalQuestionnaire = {
      ...questionnaireStructure,
      ...questionnaireDetails,
      lastEdited: questionnaireDetails.updated_at ? format(new Date(questionnaireDetails.updated_at), "MMM d, yyyy") : 'N/A',
    };
    return { questionnaire: finalQuestionnaire, responses: responsesData };
  };

  const { data, isLoading, isError, error, isFetching } = useQuery<any, Error>({
      queryKey: ['questionnaireDetails', questionnaireId],
      queryFn: fetchQuestionnaireAndResponses,
      enabled: !!questionnaireId,
  });

  const exportToMiroMutation = useMutation({
    mutationFn: async (responseId: string) => {
      return fetchWithAuth(`/api/questionnaires/${questionnaireId}/responses`, {
        method: 'POST',
        body: JSON.stringify({ responseId }),
      }, getToken);
    },
    onSuccess: (data) => {
      toast.success("Successfully exported to Miro!", {
        description: "A board has been created/updated with the discussion points.",
        action: {
          label: "Open Board",
          onClick: () => window.open(data.boardUrl, '_blank'),
        },
        duration: 10000,
      });
    },
    onError: (error: any) => {
      if (error.action === 'connect_miro' && user?.id) {
          toast.error("Miro account not connected.", {
              description: "Please connect your Miro account to enable exporting.",
              action: {
                  label: "Connect Miro",
                  onClick: () => {
                      // Construct auth URL
                      const authUrl = `/api/health?action=miro_auth&userId=${user.id}`;
                      
                      console.log('🔐 Opening Miro auth window:', authUrl);
                      
                      // Open popup
                      const authWindow = window.open(
                        authUrl, 
                        'MiroAuth', 
                        'width=600,height=700,popup=1,location=1,menubar=0,toolbar=0'
                      );
                      
                      if (!authWindow) {
                        toast.error("Popup blocked", {
                          description: "Please allow popups and try again."
                        });
                        return;
                      }
                      
                      // Monitor popup closure
                      const checkWindow = setInterval(() => {
                          if (authWindow?.closed) {
                              clearInterval(checkWindow);
                              console.log('✅ Auth window closed');
                          }
                      }, 500);
                  }
              }
          });
      } else {
          toast.error("Export failed", { 
            description: error.message || "An unknown error occurred." 
          });
      }
    },
  });

  const getQuestionPrompt = (sections: Section[] = [], questionId: string): string => {
    for (const section of sections) {
        const question = section.questions.find(q => q.id === questionId);
        if (question) return question.prompt;
    }
    return `Unknown Question (${questionId.substring(0, 8)}...)`;
  };
  
  const handleRefetch = () => queryClient.invalidateQueries({ queryKey: ['questionnaireDetails', questionnaireId] });
  
  if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (isError) return <div className="flex h-screen items-center justify-center text-destructive">Error: {error.message}</div>;
  if (!data) return <div className="flex h-screen items-center justify-center">Questionnaire data could not be loaded.</div>;

  const { questionnaire, responses } = data;

  return (
    <div className="relative min-h-full">
        <ShareDialog open={shareOpen} onOpenChange={setShareOpen} questionnaireId={questionnaireId!} />
        <EditQuestionnaireDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} questionnaire={questionnaire}/>
        
        <header className="border-b bg-card/50 backdrop-blur-sm sticky top-16 z-10">
            <div className="mx-auto max-w-7xl px-6 py-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}><ArrowLeft className="h-5 w-5" /></Button>
                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-semibold">{questionnaire.title}</h1>
                            <Badge variant={questionnaire.status === "published" ? "default" : "secondary"}>{questionnaire.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{questionnaire.organization} • Owned by {questionnaire.owner} • Last edited {questionnaire.lastEdited}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={handleRefetch} disabled={isFetching}><RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} /></Button>
                        <Button variant="outline" className="gap-2" onClick={() => setShareOpen(true)}><Share2 className="h-4 w-4" />Share</Button>
                        <Button variant="outline" className="gap-2" onClick={() => navigate(`/form-preview/${questionnaireId}`)}><Eye className="h-4 w-4" />Preview</Button>
                        <Button variant="outline" className="gap-2" onClick={() => setIsEditDialogOpen(true)}><FilePenLine className="h-4 w-4" />Edit Details</Button>
                        <Button className="gap-2" onClick={() => navigate(`/builder/${questionnaire.id}`)}><Edit className="h-4 w-4" />Edit Content</Button>
                    </div>
                </div>
            </div>
        </header>
        
        <main className="mx-auto max-w-7xl px-6 py-8">
            <div className="grid gap-6 md:grid-cols-3 mb-8">
                <Card><CardHeader className="pb-2"><CardDescription>Responses</CardDescription><CardTitle className="text-4xl">{responses?.length ?? 0}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">{responses?.length ?? 0} responses received</p></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardDescription>Sections</CardDescription><CardTitle className="text-4xl">{questionnaire.sections?.length ?? 0}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">{questionnaire.sections?.reduce((acc: number, s: Section) => acc + s.questions.length, 0) ?? 0} total questions</p></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardDescription>Last Response</CardDescription><CardTitle className="text-xl">{responses?.length > 0 && responses[0].submitted_at ? formatDistanceToNow(new Date(responses[0].submitted_at), { addSuffix: true }) : 'N/A'}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">Latest submission time</p></CardContent></Card>
            </div>
            <div>
                <h2 className="text-2xl font-semibold mb-4">Submitted Responses</h2>
                {responses && responses.length > 0 ? (
                    <Accordion type="single" collapsible className="w-full space-y-2">
                        {responses.map((response: ResponseType, index: number) => (
                            <AccordionItem value={`item-${index}`} key={response.id} className="border-b-0">
                                <Card>
                                    <AccordionTrigger className="p-4 hover:no-underline">
                                        <div className="flex justify-between w-full items-center pr-4">
                                            <div className="text-left"><p className="font-semibold">Response #{responses.length - index}</p><p className="text-sm text-muted-foreground">from {response.respondent_id}</p></div>
                                            <p className="text-sm text-muted-foreground">{response.submitted_at ? format(new Date(response.submitted_at), "MMM d, yyyy 'at' h:mm a") : ''}</p>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-4 pt-0">
                                        <div className="flex justify-end mb-4">
                                            <Button variant="outline" size="sm" onClick={() => exportToMiroMutation.mutate(response.id)} disabled={exportToMiroMutation.isPending}>
                                                {exportToMiroMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
                                                Export to Miro Board
                                            </Button>
                                        </div>
                                        <div className="bg-muted/50 p-4 rounded-lg space-y-4">
                                            <h4 className="font-semibold text-base">Answers:</h4>
                                            <dl className="text-sm space-y-3">
                                                {Object.entries(response.answers).map(([questionId, answer]) => (
                                                    <div key={questionId} className="grid grid-cols-1 md:grid-cols-3 gap-2 border-t pt-3 first:border-t-0 first:pt-0">
                                                        <dt className="font-medium text-muted-foreground col-span-1">{getQuestionPrompt(questionnaire.sections, questionId)}</dt>
                                                        <dd className="col-span-1 md:col-span-2 whitespace-pre-wrap">{String(answer)}</dd>
                                                    </div>
                                                ))}
                                            </dl>
                                        </div>
                                    </AccordionContent>
                                </Card>
                            </AccordionItem>
                        ))}
                    </Accordion>
                ) : (<div className="text-center p-8 border border-dashed rounded-lg"><h3 className="text-lg font-medium">No Responses Yet</h3><p className="text-muted-foreground mt-2">Share the form with your client to start collecting responses.</p></div>)}
            </div>
        </main>
    </div>
  );
};

export default QuestionnaireDetail;