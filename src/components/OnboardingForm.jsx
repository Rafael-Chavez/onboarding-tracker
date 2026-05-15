import { memo, useCallback, useState } from 'react';

const OnboardingForm = ({
  selectedDate,
  employees,
  addOnboarding
}) => {
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [clientName, setClientName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEmployeeChange = useCallback((e) => {
    setSelectedEmployee(e.target.value);
  }, []);

  const handleClientChange = useCallback((e) => {
    setClientName(e.target.value);
  }, []);

  const handleAccountChange = useCallback((e) => {
    setAccountNumber(e.target.value);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedEmployee || !clientName.trim() || !accountNumber.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const result = await addOnboarding({
      selectedEmployee,
      clientName,
      accountNumber
    });

    if (result && result.success) {
      setClientName('');
      setAccountNumber('');
      // We keep selectedEmployee as it's often the same for multiple entries
    }
    setIsSubmitting(false);
  }, [selectedEmployee, clientName, accountNumber, addOnboarding, isSubmitting]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  }, [handleSubmit]);

  return (
    <div className="backdrop-blur-md bg-white/10 rounded-2xl border border-white/20 p-6 shadow-2xl">
      <h3 className="text-xl font-bold text-white mb-2">
        Add Onboarding
      </h3>
      <p className="text-blue-200 text-sm mb-6">
        {selectedDate.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
          year: selectedDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
        })}
      </p>

      <div className="space-y-4">
        <div>
          <label className="text-white text-sm font-medium mb-2 block">Employee</label>
          <select
            value={selectedEmployee}
            onChange={handleEmployeeChange}
            disabled={isSubmitting}
            className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-transparent transition-colors disabled:opacity-50"
          >
            <option value="" className="text-gray-800">Select Employee</option>
            {employees.map(employee => (
              <option key={employee.id} value={employee.id} className="text-gray-800">
                {employee.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-white text-sm font-medium mb-2 block">Client Name</label>
          <input
            type="text"
            value={clientName}
            onChange={handleClientChange}
            disabled={isSubmitting}
            placeholder="Enter client name..."
            className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-transparent transition-colors disabled:opacity-50"
          />
        </div>

        <div>
          <label className="text-white text-sm font-medium mb-2 block">Account Number</label>
          <input
            type="text"
            value={accountNumber}
            onChange={handleAccountChange}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
            placeholder="Enter account number..."
            className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-transparent transition-colors disabled:opacity-50"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!selectedEmployee || !clientName.trim() || !accountNumber.trim() || isSubmitting}
          className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-blue-400/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg hover:shadow-blue-500/25"
        >
          {isSubmitting ? 'Adding...' : 'Add Onboarding'}
        </button>
      </div>
    </div>
  );
};

export default memo(OnboardingForm);
