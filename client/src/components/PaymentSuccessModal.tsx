import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "./assets/icons";

interface PaymentSuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  storyTitle: string;
  format: string;
}

export default function PaymentSuccessModal({ 
  open, 
  onOpenChange, 
  orderId,
  storyTitle,
  format
}: PaymentSuccessModalProps) {
  const [_, setLocation] = useLocation();

  const handleReturn = () => {
    onOpenChange(false);
    setLocation("/dashboard");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="text-center" aria-describedby="payment-success-description">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium text-neutral-900 mb-2">Order Confirmed!</DialogTitle>
          <DialogDescription id="payment-success-description" className="text-sm text-neutral-500">
            Thank you for your order. Your story will be professionally printed and shipped to you shortly.
          </DialogDescription>
        </DialogHeader>
        
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
          <CheckIcon className="h-8 w-8 text-green-600" />
        </div>
        
        <div>
          
          <div className="mt-6 bg-neutral-50 rounded-md p-4 text-left">
            <p className="text-sm font-medium text-neutral-800 mb-1">Order Summary</p>
            <p className="text-sm text-neutral-600">Order #: <span className="font-medium">{orderId}</span></p>
            <p className="text-sm text-neutral-600">1 × {format.charAt(0).toUpperCase() + format.slice(1)}: "{storyTitle}"</p>
            <p className="text-sm text-neutral-600 mt-1">
              Estimated delivery: <span className="font-medium">{format === 'ebook' ? 'Immediate download' : '14-21 business days'}</span>
            </p>
          </div>
          
          <div className="mt-6">
            <Button 
              onClick={handleReturn}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Return to Dashboard
            </Button>
            <p className="text-xs text-neutral-500 mt-2">
              An email confirmation has been sent to your registered email address.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
