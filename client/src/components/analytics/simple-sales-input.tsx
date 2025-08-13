import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign, Users, Calendar, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SimpleSalesInputProps {
  onSalesAdded?: () => void;
}

export const SimpleSalesInput: React.FC<SimpleSalesInputProps> = ({ onSalesAdded }) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    totalSales: '',
    cirqlDrivenSales: '',
    customerCount: '',
    newCustomers: '',
    returningCustomers: '',
    notes: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    
    if (!formData.totalSales || !formData.date) {
      toast({
        title: "Validation Error",
        description: "Please fill in the date and total sales amount",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const submitData = {
        businessId: "default-business-id",
        date: formData.date,
        totalSales: formData.totalSales,
        cirqlDrivenSales: formData.cirqlDrivenSales || "0",
        customerCount: parseInt(formData.customerCount) || 0,
        newCustomers: parseInt(formData.newCustomers) || 0,
        returningCustomers: parseInt(formData.returningCustomers) || 0,
        notes: formData.notes || ""
      };

      const response = await fetch("/api/sales-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to add sales data: ${errorText}`);
      }

      toast({
        title: "Success",
        description: "Sales data added successfully!",
      });
      
      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        totalSales: '',
        cirqlDrivenSales: '',
        customerCount: '',
        newCustomers: '',
        returningCustomers: '',
        notes: ''
      });

      if (onSalesAdded) onSalesAdded();
      
    } catch (error) {
      console.error("Error submitting sales data:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit sales data",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-500" />
          Add Sales Data
        </CardTitle>
        <CardDescription>
          Input your actual sales figures for comparison with Cirqlback performance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date */}
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Total Sales */}
          <div className="space-y-2">
            <Label htmlFor="totalSales">Total Sales ($)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="totalSales"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.totalSales}
                onChange={(e) => handleInputChange('totalSales', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Cirql-Driven Sales */}
          <div className="space-y-2">
            <Label htmlFor="cirqlSales">Cirql-Driven Sales ($)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="cirqlSales"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.cirqlDrivenSales}
                onChange={(e) => handleInputChange('cirqlDrivenSales', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Total Customers */}
          <div className="space-y-2">
            <Label htmlFor="customerCount">Total Customers</Label>
            <div className="relative">
              <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="customerCount"
                type="number"
                placeholder="0"
                value={formData.customerCount}
                onChange={(e) => handleInputChange('customerCount', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* New Customers */}
          <div className="space-y-2">
            <Label htmlFor="newCustomers">New Customers</Label>
            <div className="relative">
              <Plus className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="newCustomers"
                type="number"
                placeholder="0"
                value={formData.newCustomers}
                onChange={(e) => handleInputChange('newCustomers', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notes (Optional)</Label>
          <Textarea
            id="notes"
            placeholder="Any additional notes about this day's sales..."
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            className="min-h-[80px]"
          />
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium"
        >
          {isSubmitting ? "Saving..." : "Add Sales Data"}
        </Button>
      </CardContent>
    </Card>
  );
};