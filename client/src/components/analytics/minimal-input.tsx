import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";

export const MinimalInput: React.FC = () => {
  const handleSave = () => {
    const dateInput = document.getElementById('simple-date') as HTMLInputElement;
    const salesInput = document.getElementById('simple-sales') as HTMLInputElement;
    
    if (!dateInput?.value || !salesInput?.value) {
      alert('Please fill in both fields');
      return;
    }

    const data = {
      businessId: "default-business-id",
      date: dateInput.value,
      totalSales: salesInput.value,
      cirqlDrivenSales: "0",
      customerCount: 0,
      newCustomers: 0,
      returningCustomers: 0,
      notes: ""
    };

    fetch("/api/sales-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    .then(response => {
      if (response.ok) {
        alert('Data saved successfully!');
        dateInput.value = new Date().toISOString().split('T')[0];
        salesInput.value = '';
      } else {
        alert('Error saving data');
      }
    })
    .catch(error => {
      console.error('Error:', error);
      alert('Error saving data');
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-500" />
          Simple Sales Input
        </CardTitle>
        <CardDescription>
          Basic sales data entry
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Date</label>
          <input
            id="simple-date"
            type="date"
            defaultValue={new Date().toISOString().split('T')[0]}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Total Sales ($)</label>
          <input
            id="simple-sales"
            type="number"
            step="0.01"
            placeholder="0.00"
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          />
        </div>
        
        <button
          onClick={handleSave}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#7c3aed',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Save Data
        </button>
      </CardContent>
    </Card>
  );
};