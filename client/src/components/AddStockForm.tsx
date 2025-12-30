import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertStockSchema, type StockInput } from "@shared/routes";
import { useCreateStock } from "@/hooks/use-stocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function AddStockForm() {
  const { toast } = useToast();
  const createStock = useCreateStock();

  const form = useForm<StockInput>({
    resolver: zodResolver(insertStockSchema),
    defaultValues: {
      symbol: "",
      name: "",
      exchange: "NASDAQ",
      currency: "USD",
      quantity: 1, // Will be coerced but good for UI default
      purchasePrice: 0,
    },
  });

  const onSubmit = (data: StockInput) => {
    createStock.mutate(data, {
      onSuccess: () => {
        toast({
          title: "Stock Added",
          description: `Successfully added ${data.symbol} to your portfolio.`,
        });
        form.reset();
      },
      onError: (error) => {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message,
        });
      },
    });
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-6 sticky top-24">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-primary/10 p-2 rounded-lg text-primary">
          <Plus className="w-5 h-5" />
        </div>
        <h2 className="text-lg font-bold font-display text-foreground">Add Holding</h2>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="symbol">Symbol</Label>
            <Input 
              id="symbol" 
              placeholder="AAPL" 
              className="font-mono uppercase"
              {...form.register("symbol")} 
            />
            {form.formState.errors.symbol && (
              <p className="text-xs text-destructive">{form.formState.errors.symbol.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="exchange">Exchange</Label>
            <Select 
              defaultValue="NASDAQ" 
              onValueChange={(val) => form.setValue("exchange", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NASDAQ">NASDAQ</SelectItem>
                <SelectItem value="NYSE">NYSE</SelectItem>
                <SelectItem value="LSE">LSE</SelectItem>
                <SelectItem value="CRYPTO">CRYPTO</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Company Name</Label>
          <Input 
            id="name" 
            placeholder="Apple Inc." 
            {...form.register("name")} 
          />
          {form.formState.errors.name && (
            <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input 
              id="quantity" 
              type="number" 
              step="0.0001"
              min="0"
              {...form.register("quantity", { valueAsNumber: true })} 
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="purchasePrice">Avg. Price</Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
              <Input 
                id="purchasePrice" 
                type="number" 
                step="0.01"
                min="0"
                className="pl-7"
                {...form.register("purchasePrice", { valueAsNumber: true })} 
              />
            </div>
          </div>
        </div>

        <Button 
          type="submit" 
          className="w-full mt-4 bg-primary hover:bg-primary/90 text-white font-semibold shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98]"
          disabled={createStock.isPending}
        >
          {createStock.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Plus className="w-4 h-4 mr-2" />
          )}
          Add to Portfolio
        </Button>
      </form>
    </div>
  );
}
