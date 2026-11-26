import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { downloadStatsCard, type ShareStatsCard } from "@/lib/share-stats-card";

const ShareStatsCardButton = ({ card }: { card: ShareStatsCard }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadStatsCard(card);
      toast({ title: "Stats card downloaded", description: "Your cricket card is ready to share." });
    } catch {
      toast({ title: "Download unavailable", description: "This browser could not create the image.", variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Button type="button" variant="outline" className="gap-2 border-primary/40" onClick={handleDownload} disabled={isDownloading}>
      <Download className="h-4 w-4" />
      {isDownloading ? "Preparing card…" : "Share Stats Card"}
    </Button>
  );
};

export default ShareStatsCardButton;