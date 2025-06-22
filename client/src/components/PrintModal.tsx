import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import PaymentSuccessModal from "./PaymentSuccessModal";
import { 
  CloseIcon, 
  BookIcon, 
  BookletIcon, 
  FileIcon,
  PlusIcon,
  MinusIcon,
  CartIcon,
  CheckIcon
} from "./assets/icons";

interface PrintModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storyId: number;
}

export default function PrintModal({ 
  open, 
  onOpenChange, 
  storyId 
}: PrintModalProps) {
  const { toast } = useToast();
  const [format, setFormat] = useState("paperback");
  const [quantity, setQuantity] = useState(1);
  const [specialRequests, setSpecialRequests] = useState("");
  const [paymentSuccessModalOpen, setPaymentSuccessModalOpen] = useState(false);
  const [orderId, setOrderId] = useState("");

  // Get story details
  const { data: story, isLoading } = useQuery({
    queryKey: [`/api/stories/${storyId}`],
    enabled: open,
  });

  // Calculate prices based on format
  const prices = {
    paperback: 1499, // $14.99
    hardcover: 2499, // $24.99
    ebook: 999, // $9.99
  };

  const formatPrices = {
    paperback: "$14.99",
    hardcover: "$24.99",
    ebook: "$9.99",
  };

  // Get price based on selected format
  const getFormatPrice = () => {
    return format === "paperback" 
      ? prices.paperback 
      : format === "hardcover" 
        ? prices.hardcover 
        : prices.ebook;
  };

  // Calculate subtotal
  const subtotal = getFormatPrice() * quantity;
  
  // Add shipping if not ebook
  const shipping = format === "ebook" ? 0 : 499; // $4.99
  
  // Calculate total
  const total = subtotal + shipping;

  // Format cents to dollars
  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  // Create print order mutation
  const createPrintOrderMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/stories/${storyId}/print`, {
        format,
        quantity,
        specialRequests: specialRequests || null,
        totalPrice: total,
        status: "pending"
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Order created!",
        description: "Your print order has been created successfully.",
      });
      setOrderId(data.orderId);
      onOpenChange(false);
      setPaymentSuccessModalOpen(true);
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
    onError: (error) => {
      toast({
        title: "Error creating order",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle quantity change
  const incrementQuantity = () => {
    if (quantity < 10) {
      setQuantity(quantity + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  // Handle checkout
  const handleCheckout = () => {
    createPrintOrderMutation.mutate();
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <Skeleton className="h-12 w-12 rounded-full mx-auto mb-4" />
            <Skeleton className="h-6 w-48 mx-auto mb-2" />
            <Skeleton className="h-4 w-64 mx-auto mb-6" />
          </DialogHeader>
          
          <Skeleton className="h-20 w-full mb-4" />
          <Skeleton className="h-10 w-full mb-4" />
          <Skeleton className="h-20 w-full mb-4" />
          
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-4" />
          
          <Skeleton className="h-10 w-full" />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="absolute top-4 right-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onOpenChange(false)}
              className="h-6 w-6 text-neutral-400 hover:text-neutral-500"
            >
              <CloseIcon className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-accent/20 mb-4">
              <BookIcon className="text-accent" />
            </div>
            <DialogTitle>Print Your Story</DialogTitle>
            <DialogDescription className="mt-2 mb-6">
              Turn your collaborative masterpiece into a professionally printed book that you can treasure forever.
            </DialogDescription>
          </div>
          
          {/* Book Options */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Select Format</label>
              <div className="grid grid-cols-3 gap-3">
                <div 
                  className={`relative border rounded-md p-3 flex flex-col items-center cursor-pointer ${format === 'paperback' ? 'border-primary' : 'border-neutral-300 hover:border-primary'}`}
                  onClick={() => setFormat('paperback')}
                >
                  {format === 'paperback' && (
                    <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                      <CheckIcon className="text-white text-xs" />
                    </span>
                  )}
                  <BookIcon className="text-2xl text-neutral-600 mb-2" />
                  <span className="text-xs font-medium text-neutral-800">Paperback</span>
                  <span className="text-xs text-neutral-500 mt-1">{formatPrices.paperback}</span>
                </div>
                <div 
                  className={`relative border rounded-md p-3 flex flex-col items-center cursor-pointer ${format === 'hardcover' ? 'border-primary' : 'border-neutral-300 hover:border-primary'}`}
                  onClick={() => setFormat('hardcover')}
                >
                  {format === 'hardcover' && (
                    <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                      <CheckIcon className="text-white text-xs" />
                    </span>
                  )}
                  <BookletIcon className="text-2xl text-neutral-600 mb-2" />
                  <span className="text-xs font-medium text-neutral-800">Hardcover</span>
                  <span className="text-xs text-neutral-500 mt-1">{formatPrices.hardcover}</span>
                </div>
                <div 
                  className={`relative border rounded-md p-3 flex flex-col items-center cursor-pointer ${format === 'ebook' ? 'border-primary' : 'border-neutral-300 hover:border-primary'}`}
                  onClick={() => setFormat('ebook')}
                >
                  {format === 'ebook' && (
                    <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                      <CheckIcon className="text-white text-xs" />
                    </span>
                  )}
                  <FileIcon className="text-2xl text-neutral-600 mb-2" />
                  <span className="text-xs font-medium text-neutral-800">E-Book</span>
                  <span className="text-xs text-neutral-500 mt-1">{formatPrices.ebook}</span>
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Copies</label>
              <div className="flex items-center">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon" 
                  onClick={decrementQuantity}
                  disabled={quantity <= 1}
                  className="rounded-r-none"
                >
                  <MinusIcon />
                </Button>
                <Input 
                  type="number" 
                  value={quantity} 
                  min={1} 
                  max={10}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-16 text-center rounded-none border-l-0 border-r-0"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon" 
                  onClick={incrementQuantity}
                  disabled={quantity >= 10}
                  className="rounded-l-none"
                >
                  <PlusIcon />
                </Button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Special Requests (Optional)</label>
              <Textarea 
                rows={2} 
                placeholder="Additional notes for printing..."
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
              />
            </div>
            
            <div className="pt-4 border-t border-neutral-200">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-neutral-600">Subtotal</span>
                <span className="font-medium">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-neutral-600">Shipping</span>
                <span className="font-medium">{format === 'ebook' ? 'Free' : formatPrice(shipping)}</span>
              </div>
              <div className="flex justify-between text-base font-medium pt-2 border-t border-neutral-200 mt-2">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>
            
            <div className="pt-2">
              <Button 
                className="w-full py-3 bg-accent hover:bg-accent/90 flex items-center justify-center"
                disabled={createPrintOrderMutation.isPending}
                onClick={handleCheckout}
              >
                <CartIcon className="mr-2" />
                {createPrintOrderMutation.isPending ? "Processing..." : "Proceed to Checkout"}
              </Button>
              <p className="text-xs text-neutral-500 text-center mt-2">
                We'll collect shipping details on the next screen
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <PaymentSuccessModal
        open={paymentSuccessModalOpen}
        onOpenChange={setPaymentSuccessModalOpen}
        orderId={orderId}
        storyTitle={story?.title || ""}
        format={format}
      />
    </>
  );
}
