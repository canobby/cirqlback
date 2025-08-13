import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, Calendar, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const BasicSalesForm: React.FC = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    const formData = new FormData(e.currentTarget);
    const date = formData.get('date') as string;
    const totalSales = formData.get('totalSales') as string;
    const cirqlSales = formData.get('cirqlSales') as string || '0';
    const customers = formData.get('customers') as string || '0';
    const newCustomers = formData.get('newCustomers') as string || '0';
    const notes = formData.get('notes') as string || '';

    if (!date || !totalSales) {
      toast({
        title: "Missing Required Fields",
        description: "Please enter a date and total sales amount",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/sales-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: "default-business-id",
          date: date,
          totalSales: totalSales,
          cirqlDrivenSales: cirqlSales,
          customerCount: parseInt(customers) || 0,
          newCustomers: parseInt(newCustomers) || 0,
          returningCustomers: Math.max(0, (parseInt(customers) || 0) - (parseInt(newCustomers) || 0)),
          notes: notes
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      toast({
        title: "Success",
        description: "Sales data saved successfully!",
      });
      
      // Reset form
      (e.target as HTMLFormElement).reset();
      
    } catch (error) {
      console.error("Submit error:", error);
      toast({
        title: "Error",
        description: "Failed to save sales data. Please try again.",
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
          Sales Data Input
        </CardTitle>
        <CardDescription>
          Enter your actual sales figures to track performance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* Date */}
          <div>
            <label htmlFor="date" className="block text-sm font-medium mb-1">
              Date *
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                id="date"
                name="date"
                type="date"
                required
                defaultValue={new Date().toISOString().split('T')[0]}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Total Sales */}
            <div>
              <label htmlFor="totalSales" className="block text-sm font-medium mb-1">
                Total Sales ($) *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  id="totalSales"
                  name="totalSales"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Cirql Sales */}
            <div>
              <label htmlFor="cirqlSales" className="block text-sm font-medium mb-1">
                Cirql-Driven Sales ($)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  id="cirqlSales"
                  name="cirqlSales"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Customer Count */}
            <div>
              <label htmlFor="customers" className="block text-sm font-medium mb-1">
                Total Customers
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  id="customers"
                  name="customers"
                  type="number"
                  min="0"
                  placeholder="0"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* New Customers */}
            <div>
              <label htmlFor="newCustomers" className="block text-sm font-medium mb-1">
                New Customers
              </label>
              <div className="relative">
                <Plus className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  id="newCustomers"
                  name="newCustomers"
                  type="number"
                  min="0"
                  placeholder="0"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium mb-1">
              Notes (Optional)
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              placeholder="Any additional notes about this day's sales..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium"
          >
            {isSubmitting ? "Saving..." : "Save Sales Data"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};