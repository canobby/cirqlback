import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarIcon, TrendingUp, TrendingDown, DollarSign, Users, PlusCircle, BarChart3, Target, AlertCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

// Form schemas
const salesDataSchema = z.object({
  businessId: z.string().min(1, "Business ID is required"),
  date: z.string().min(1, "Date is required"),
  totalSales: z.string().min(1, "Total sales amount is required"),
  cirqlDrivenSales: z.string().optional(),
  customerCount: z.number().min(0, "Customer count must be positive").optional(),
  newCustomers: z.number().min(0, "New customer count must be positive").optional(),
  returningCustomers: z.number().min(0, "Returning customer count must be positive").optional(),
  notes: z.string().optional(),
});

const businessGoalSchema = z.object({
  businessId: z.string().min(1, "Business ID is required"),
  goalType: z.enum(["revenue", "customers", "retention", "avg_ticket"]),
  targetValue: z.string().min(1, "Target value is required"),
  timeframe: z.enum(["monthly", "quarterly", "yearly"]),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
});

type SalesDataFormValues = z.infer<typeof salesDataSchema>;
type BusinessGoalFormValues = z.infer<typeof businessGoalSchema>;

interface SalesDataInputProps {
  businessId: string;
  businessName?: string;
}

export function SalesDataInput({ businessId, businessName = "Your Business" }: SalesDataInputProps) {
  const [activeTab, setActiveTab] = useState("input");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Forms
  const salesForm = useForm<SalesDataFormValues>({
    resolver: zodResolver(salesDataSchema),
    defaultValues: {
      businessId,
      date: new Date().toISOString().split('T')[0],
      totalSales: "",
      cirqlDrivenSales: "0.00",
      customerCount: 0,
      newCustomers: 0,
      returningCustomers: 0,
      notes: "",
    },
  });

  const goalForm = useForm<BusinessGoalFormValues>({
    resolver: zodResolver(businessGoalSchema),
    defaultValues: {
      businessId,
      goalType: "revenue",
      targetValue: "",
      timeframe: "monthly",
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
    },
  });

  // Queries
  const { data: salesData = [] } = useQuery({
    queryKey: ["/api/sales-data", businessId],
    queryFn: async () => {
      const response = await fetch(`/api/sales-data/${businessId}`);
      if (!response.ok) throw new Error("Failed to fetch sales data");
      return response.json();
    },
  });

  const { data: realComparison } = useQuery({
    queryKey: ["/api/analytics/real-comparison", businessId],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/real-comparison/${businessId}`);
      if (!response.ok) throw new Error("Failed to fetch comparison data");
      return response.json();
    },
  });

  // Mutations
  const addSalesData = useMutation({
    mutationFn: async (data: SalesDataFormValues) => {
      const response = await fetch("/api/sales-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to add sales data");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Sales data added successfully!" });
      salesForm.reset({
        businessId,
        date: new Date().toISOString().split('T')[0],
        totalSales: "",
        cirqlDrivenSales: "0.00",
        customerCount: 0,
        newCustomers: 0,
        returningCustomers: 0,
        notes: "",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-data", businessId] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/real-comparison", businessId] });
    },
    onError: (error) => {
      toast({ title: "Error", description: "Failed to add sales data. Please try again.", variant: "destructive" });
    },
  });

  const addBusinessGoal = useMutation({
    mutationFn: async (data: BusinessGoalFormValues) => {
      const response = await fetch("/api/business-goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to add business goal");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Business goal added successfully!" });
      goalForm.reset();
    },
    onError: (error) => {
      toast({ title: "Error", description: "Failed to add business goal. Please try again.", variant: "destructive" });
    },
  });

  const onSubmitSalesData = async () => {
    // Prevent form submission if already loading
    if (addSalesData.isPending) return;
    
    try {
      // Validate form data
      const isValid = await salesForm.trigger();
      if (!isValid) {
        toast({ title: "Validation Error", description: "Please check all required fields", variant: "destructive" });
        return;
      }

      const formData = salesForm.getValues();
      addSalesData.mutate(formData);
    } catch (error) {
      console.error("Error submitting sales data:", error);
      toast({ title: "Error", description: "Failed to submit sales data", variant: "destructive" });
    }
  };

  const onSubmitBusinessGoal = async () => {
    // Prevent form submission if already loading  
    if (addBusinessGoal.isPending) return;
    
    try {
      // Validate form data
      const isValid = await goalForm.trigger();
      if (!isValid) {
        toast({ title: "Validation Error", description: "Please check all required fields", variant: "destructive" });
        return;
      }

      const formData = goalForm.getValues();
      addBusinessGoal.mutate(formData);
    } catch (error) {
      console.error("Error submitting business goal:", error);
      toast({ title: "Error", description: "Failed to submit business goal", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold gradient-text">Real Sales Data Input</h2>
        <p className="text-muted-foreground mt-2">
          Input actual sales figures to track real ROI and compare with Cirqlback performance
        </p>
      </div>

      {/* Real vs Platform Comparison */}
      {realComparison && (
        <Card className="border-2 border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-500" />
              Real Data vs Platform Estimates
            </CardTitle>
            <CardDescription>
              Compare your actual sales data with Cirqlback's performance estimates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Real Data */}
              <div className="space-y-2">
                <h4 className="font-semibold text-green-600">Real Sales Data</h4>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Sales:</span>
                    <span className="font-medium">${(realComparison as any)?.realData?.totalSales?.toLocaleString() || "0"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Cirql-Driven:</span>
                    <span className="font-medium text-purple-600">${(realComparison as any)?.realData?.cirqlDrivenSales?.toLocaleString() || "0"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">ROI:</span>
                    <span className="font-medium">{((realComparison as any)?.realData?.cirqlROI || 0).toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {/* Platform Estimates */}
              <div className="space-y-2">
                <h4 className="font-semibold text-blue-600">Platform Estimates</h4>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Taps:</span>
                    <span className="font-medium">{(realComparison as any)?.platformEstimates?.totalTaps?.toLocaleString() || "0"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Est. Revenue:</span>
                    <span className="font-medium">${(realComparison as any)?.platformEstimates?.estimatedRevenue?.toLocaleString() || "0"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Est. Customers:</span>
                    <span className="font-medium">{(realComparison as any)?.platformEstimates?.estimatedCustomers?.toLocaleString() || "0"}</span>
                  </div>
                </div>
              </div>

              {/* Insights */}
              <div className="space-y-2">
                <h4 className="font-semibold text-orange-600">AI Insights</h4>
                <div className="space-y-2">
                  <Badge variant={(realComparison as any)?.insights?.isOutperforming ? "default" : "secondary"}>
                    {(realComparison as any)?.insights?.isOutperforming ? "Outperforming" : "Underperforming"}
                  </Badge>
                  <div className="text-xs space-y-1">
                    {((realComparison as any)?.insights?.recommendedActions || []).slice(0, 2).map((action: string, index: number) => (
                      <div key={index} className="flex items-center gap-1">
                        <Target className="h-3 w-3 text-muted-foreground" />
                        <span>{action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Alert for missing data */}
            {!(realComparison as any)?.accuracy?.hasRealData && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    No real sales data found. Start inputting daily sales to see accurate comparisons.
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => {
        try {
          setActiveTab(value);
        } catch (error) {
          console.error("Tab change error:", error);
          setActiveTab("input");
        }
      }}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="input">Sales Input</TabsTrigger>
          <TabsTrigger value="history">Sales History</TabsTrigger>
          <TabsTrigger value="goals">Performance Goals</TabsTrigger>
        </TabsList>

        {/* Sales Data Input Tab */}
        <TabsContent value="input">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-green-500" />
                Add Daily Sales Data
              </CardTitle>
              <CardDescription>
                Input your actual sales figures to track real Cirqlback ROI and performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...salesForm}>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={salesForm.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={salesForm.control}
                      name="totalSales"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Sales Amount ($)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              placeholder="0.00" 
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            Enter your total sales revenue for this date
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={salesForm.control}
                      name="cirqlDrivenSales"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cirql-Driven Sales ($)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              placeholder="0.00" 
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            Estimated sales directly from Cirql taps/campaigns
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={salesForm.control}
                      name="customerCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Customers</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="0"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={salesForm.control}
                      name="newCustomers"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Customers</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="0"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={salesForm.control}
                      name="returningCustomers"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Returning Customers</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="0"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={salesForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Any additional notes about this day's sales..."
                            className="min-h-[100px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="button" 
                    onClick={onSubmitSalesData}
                    disabled={addSalesData.isPending}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium"
                  >
                    {addSalesData.isPending ? "Saving..." : "Add Sales Data"}
                  </Button>
                </div>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sales History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-500" />
                Sales History
              </CardTitle>
              <CardDescription>
                View your historical sales data and Cirqlback performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              {salesData.length === 0 ? (
                <div className="text-center py-12">
                  <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No sales data yet</h3>
                  <p className="text-muted-foreground">Start adding daily sales data to track your performance</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(salesData as any[]).slice(0, 10).map((record: any) => (
                    <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="font-medium">{new Date(record.date).toLocaleDateString()}</div>
                        <div className="text-sm text-muted-foreground">
                          {record.customerCount} customers • Avg ticket: ${record.averageTicket || "0.00"}
                        </div>
                        {record.notes && (
                          <div className="text-xs text-muted-foreground italic">{record.notes}</div>
                        )}
                      </div>
                      <div className="text-right space-y-1">
                        <div className="font-bold text-lg">${parseFloat(record.totalSales || 0).toFixed(2)}</div>
                        <div className="text-sm text-purple-600">
                          Cirql: ${parseFloat(record.cirqlDrivenSales || 0).toFixed(2)} ({(record.cirqlROI || 0).toFixed(1)}%)
                        </div>
                        <Badge variant={record.isProfitable ? "default" : "secondary"}>
                          {record.isProfitable ? "Profitable" : "Break-even"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Goals Tab */}
        <TabsContent value="goals">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-orange-500" />
                Performance Goals
              </CardTitle>
              <CardDescription>
                Set and track your business performance goals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...goalForm}>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={goalForm.control}
                      name="goalType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Goal Type</FormLabel>
                          <FormControl>
                            <select {...field} className="w-full p-2 border rounded-md">
                              <option value="revenue">Revenue</option>
                              <option value="customers">Customer Count</option>
                              <option value="retention">Retention Rate</option>
                              <option value="avg_ticket">Average Ticket Size</option>
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={goalForm.control}
                      name="targetValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Value</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              placeholder="10000" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={goalForm.control}
                      name="timeframe"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Timeframe</FormLabel>
                          <FormControl>
                            <select {...field} className="w-full p-2 border rounded-md">
                              <option value="monthly">Monthly</option>
                              <option value="quarterly">Quarterly</option>
                              <option value="yearly">Yearly</option>
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={goalForm.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button 
                    type="button" 
                    onClick={onSubmitBusinessGoal}
                    disabled={addBusinessGoal.isPending}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-medium"
                  >
                    {addBusinessGoal.isPending ? "Setting Goal..." : "Set Performance Goal"}
                  </Button>
                </div>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}