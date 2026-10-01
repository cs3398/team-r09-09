import javax.swing.*;
import javax.swing.table.DefaultTableModel;
import java.awt.*;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class TheNightOwlApp extends JFrame {

    // --- USER ACCOUNT DATA STRUCTURE ---
    static class UserData {
        String email;
        String password;
        double budget = 2500.00;
        List<Expense> expenses = new ArrayList<>();

        public UserData(String email, String password) {
            this.email = email;
            this.password = password;
        }
    }

    // Expense Model
    static class Expense {
        String title;
        double amount;
        String category;

        public Expense(String title, double amount, String category) {
            this.title = title;
            this.amount = amount;
            this.category = category;
        }
    }

    // --- APPLICATION STATE (MULTI-USER HASHMAP) ---
    private Map<String, UserData> userDatabase = new HashMap<>();
    private UserData currentUser; // Active logged-in user account

    private final String[] categories = {
        "Tuition & Fees",
        "Housing & Utilities",
        "Dining & Night Bites",
        "Transportation & Travel",
        "Lifestyle & Emergency"
    };

    // UI Navigation CardLayout
    private CardLayout cardLayout = new CardLayout();
    private JPanel mainPanel = new JPanel(cardLayout);

    // Dashboard Components
    private JLabel totalSpentLabel = new JLabel("$0.00");
    private JLabel remainingBalanceLabel = new JLabel("$2,500.00");
    private JLabel budgetLimitLabel = new JLabel("(Limit $2,500.00)");
    private JTextField budgetInputField = new JTextField(6);

    private DefaultTableModel tableModel;
    private JPanel categoryBreakdownPanel = new JPanel();

    public TheNightOwlApp() {
        setTitle("The Night Owl - Student Budget Planner");
        setSize(1600, 1000);
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setLocationRelativeTo(null);

        // Pre-seed a default demo account for instant testing
        userDatabase.put("demo@owl.edu", new UserData("demo@owl.edu", "password123"));

        // Build Navigation Screens
        mainPanel.add(createAuthScreen(), "Auth");
        mainPanel.add(createDashboardScreen(), "Dashboard");

        add(mainPanel);
        cardLayout.show(mainPanel, "Auth");
    }

    // --- 1. AUTHENTICATION SCREEN ---
    private JPanel createAuthScreen() {
        JPanel outer = new JPanel(new GridBagLayout());
        outer.setBackground(new Color(15, 23, 42)); // Deep Slate

       JPanel card = new JPanel();
        card.setLayout(new BoxLayout(card, BoxLayout.Y_AXIS));
        card.setBackground(new Color(30, 41, 59)); // Slate Card
        card.setBorder(BorderFactory.createCompoundBorder(
            BorderFactory.createLineBorder(new Color(51, 65, 85), 2),
            BorderFactory.createEmptyBorder(40, 45, 40, 45)
        ));
        card.setPreferredSize(new Dimension(680, 820));

       // App Header Brand Logo
        JLabel logoBadge = new JLabel(new Icon() {
            @Override
            public void paintIcon(Component c, Graphics g, int x, int y) {
                Graphics2D g2 = (Graphics2D) g.create();
                g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
                
                // Outer Glowing Circle Badge
                g2.setColor(new Color(59, 130, 246)); // Bright Blue
                g2.fillOval(x + 4, y + 4, 64, 64);

                // Owl Body
                g2.setColor(new Color(15, 23, 42)); // Dark Slate
                g2.fillOval(x + 12, y + 14, 48, 48);

                // Owl Eye Rings
                g2.setColor(new Color(59, 130, 246));
                g2.drawOval(x + 18, y + 22, 16, 16);
                g2.drawOval(x + 38, y + 22, 16, 16);

                // Pupils
                g2.setColor(Color.WHITE);
                g2.fillOval(x + 24, y + 27, 6, 6);
                g2.fillOval(x + 42, y + 27, 6, 6);

                // Amber Beak
                g2.setColor(new Color(245, 158, 11));
                int[] xPoints = {x + 32, x + 40, x + 36};
                int[] yPoints = {y + 40, y + 40, y + 48};
                g2.fillPolygon(xPoints, yPoints, 3);

                g2.dispose();
            }

            @Override
            public int getIconWidth() { return 72; }

            @Override
            public int getIconHeight() { return 72; }
        });
        logoBadge.setAlignmentX(Component.CENTER_ALIGNMENT);

        JLabel brandNameLabel = new JLabel("THE NIGHT OWL");
        brandNameLabel.setFont(new Font("SansSerif", Font.BOLD, 14));
        brandNameLabel.setForeground(new Color(56, 189, 248));
        brandNameLabel.setAlignmentX(Component.CENTER_ALIGNMENT);
        JLabel titleLabel = new JLabel("Student Budget Planner");
        titleLabel.setFont(new Font("SansSerif", Font.BOLD, 30));
        titleLabel.setForeground(Color.WHITE);
        titleLabel.setAlignmentX(Component.CENTER_ALIGNMENT);

        JLabel subTitleLabel = new JLabel("Manage your money, track expenses, and stay on budget.");
        subTitleLabel.setFont(new Font("SansSerif", Font.PLAIN, 14));
        subTitleLabel.setForeground(new Color(148, 163, 184));
        subTitleLabel.setAlignmentX(Component.CENTER_ALIGNMENT);

        // 5 Core Categories Preview
        JPanel previewBox = new JPanel();
        previewBox.setLayout(new BoxLayout(previewBox, BoxLayout.Y_AXIS));
        previewBox.setBackground(new Color(15, 23, 42));
        previewBox.setBorder(BorderFactory.createCompoundBorder(
            BorderFactory.createLineBorder(new Color(51, 65, 85), 1),
            BorderFactory.createEmptyBorder(15, 20, 15, 20)
        ));
        previewBox.setAlignmentX(Component.CENTER_ALIGNMENT);

        JLabel catHeader = new JLabel("5 CORE BUDGET CATEGORIES");
        catHeader.setFont(new Font("SansSerif", Font.BOLD, 12));
        catHeader.setForeground(new Color(56, 189, 248));
        previewBox.add(catHeader);
        previewBox.add(Box.createVerticalStrut(10));

        for (String cat : categories) {
            JLabel catItem = new JLabel("  •  " + cat);
            catItem.setFont(new Font("SansSerif", Font.PLAIN, 13));
            catItem.setForeground(new Color(226, 232, 240));
            previewBox.add(catItem);
            previewBox.add(Box.createVerticalStrut(4));
        }

        // Form Fields
        JTextField emailField = createStyledTextField();
        JPasswordField passwordField = createStyledPasswordField();
        JPasswordField confirmPasswordField = createStyledPasswordField();
        confirmPasswordField.setVisible(false);

        JLabel confirmPassLbl = new JLabel("Confirm Password");
        confirmPassLbl.setFont(new Font("SansSerif", Font.BOLD, 13));
        confirmPassLbl.setForeground(new Color(203, 213, 225));
        confirmPassLbl.setVisible(false);

        JButton submitBtn = new JButton("Sign In");
        submitBtn.setBackground(new Color(59, 130, 246));
        submitBtn.setForeground(Color.WHITE);
        submitBtn.setFont(new Font("SansSerif", Font.BOLD, 15));
        submitBtn.setFocusPainted(false);
        submitBtn.setCursor(new Cursor(Cursor.HAND_CURSOR));

        JButton toggleModeBtn = new JButton("Need an account? Set up account here");
        toggleModeBtn.setFont(new Font("SansSerif", Font.PLAIN, 13));
        toggleModeBtn.setForeground(new Color(96, 165, 250));
        toggleModeBtn.setContentAreaFilled(false);
        toggleModeBtn.setBorderPainted(false);
        toggleModeBtn.setCursor(new Cursor(Cursor.HAND_CURSOR));
        toggleModeBtn.setAlignmentX(Component.CENTER_ALIGNMENT);

        final boolean[] isSignUpMode = {false};

        toggleModeBtn.addActionListener(e -> {
            isSignUpMode[0] = !isSignUpMode[0];
            if (isSignUpMode[0]) {
                submitBtn.setText("Create Account");
                confirmPassLbl.setVisible(true);
                confirmPasswordField.setVisible(true);
                toggleModeBtn.setText("Already have an account? Sign in here");
            } else {
                submitBtn.setText("Sign In");
                confirmPassLbl.setVisible(false);
                confirmPasswordField.setVisible(false);
                toggleModeBtn.setText("Need an account? Set up account here");
            }
            card.revalidate();
            card.repaint();
        });

        submitBtn.addActionListener(e -> {
            String email = emailField.getText().trim().toLowerCase();
            String password = new String(passwordField.getPassword()).trim();
            String confirmPass = new String(confirmPasswordField.getPassword()).trim();

            if (email.isEmpty() || password.isEmpty()) {
                JOptionPane.showMessageDialog(this, "Please fill in all required fields.", "Validation Error", JOptionPane.ERROR_MESSAGE);
                return;
            }

            if (isSignUpMode[0]) {
                // SIGN UP: Save user into HashMap
                if (!password.equals(confirmPass)) {
                    JOptionPane.showMessageDialog(this, "Passwords do not match.", "Sign Up Error", JOptionPane.ERROR_MESSAGE);
                    return;
                }
                if (userDatabase.containsKey(email)) {
                    JOptionPane.showMessageDialog(this, "An account with this email already exists.", "Sign Up Error", JOptionPane.WARNING_MESSAGE);
                    return;
                }

                UserData newUser = new UserData(email, password);
                userDatabase.put(email, newUser);
                currentUser = newUser;
                JOptionPane.showMessageDialog(this, "Account created successfully!", "Success", JOptionPane.INFORMATION_MESSAGE);
            } else {
                // SIGN IN: Retrieve account from HashMap
                if (!userDatabase.containsKey(email)) {
                    UserData newUser = new UserData(email, password);
                    userDatabase.put(email, newUser);
                    currentUser = newUser;
                } else {
                    UserData existing = userDatabase.get(email);
                    if (!existing.password.equals(password)) {
                        JOptionPane.showMessageDialog(this, "Incorrect password.", "Authentication Error", JOptionPane.ERROR_MESSAGE);
                        return;
                    }
                    currentUser = existing;
                }
            }

            emailField.setText("");
            passwordField.setText("");
            confirmPasswordField.setText("");

            loadUserSession();
            cardLayout.show(mainPanel, "Dashboard");
        });

        card.add(logoBadge);
        card.add(Box.createVerticalStrut(8));
        card.add(brandNameLabel);
        card.add(Box.createVerticalStrut(6));
        card.add(titleLabel);
        card.add(subTitleLabel);
        card.add(Box.createVerticalStrut(20));
        card.add(previewBox);
        card.add(Box.createVerticalStrut(20));

        JPanel formGrid = new JPanel(new GridLayout(6, 1, 4, 4));
        formGrid.setOpaque(false);

        JLabel emailLbl = new JLabel("Email Address");
        emailLbl.setFont(new Font("SansSerif", Font.BOLD, 13));
        emailLbl.setForeground(new Color(203, 213, 225));
        formGrid.add(emailLbl);
        formGrid.add(emailField);

        JLabel passLbl = new JLabel("Password");
        passLbl.setFont(new Font("SansSerif", Font.BOLD, 13));
        passLbl.setForeground(new Color(203, 213, 225));
        formGrid.add(passLbl);
        formGrid.add(passwordField);

        formGrid.add(confirmPassLbl);
        formGrid.add(confirmPasswordField);

        card.add(formGrid);
        card.add(Box.createVerticalStrut(20));
        submitBtn.setAlignmentX(Component.CENTER_ALIGNMENT);
        submitBtn.setMaximumSize(new Dimension(500, 42));
        card.add(submitBtn);
        card.add(Box.createVerticalStrut(12));
        card.add(toggleModeBtn);

        outer.add(card);
        return outer;
    }

    // --- 2. DASHBOARD SCREEN ---
    private JPanel createDashboardScreen() {
        JPanel dashboard = new JPanel();
        dashboard.setLayout(new BoxLayout(dashboard, BoxLayout.Y_AXIS));
        dashboard.setBackground(new Color(15, 23, 42));
        dashboard.setBorder(BorderFactory.createEmptyBorder(30, 30, 30, 30));

        // Header Section
        JPanel headerPanel = new JPanel(new BorderLayout());
        headerPanel.setOpaque(false);

        JLabel dashTitle = new JLabel("The Night Owl Dashboard");
        dashTitle.setFont(new Font("SansSerif", Font.BOLD, 28));
        dashTitle.setForeground(Color.WHITE);

        // Budget Setter Controls
        JPanel budgetPanel = new JPanel(new FlowLayout(FlowLayout.RIGHT, 8, 0));
        budgetPanel.setOpaque(false);

        JLabel bLbl = new JLabel("Monthly Budget/Income ($):");
        bLbl.setFont(new Font("SansSerif", Font.BOLD, 13));
        bLbl.setForeground(new Color(203, 213, 225));

        budgetInputField.setFont(new Font("SansSerif", Font.BOLD, 13));

        JButton updateBudgetBtn = new JButton("Update Budget");
        updateBudgetBtn.setFont(new Font("SansSerif", Font.BOLD, 12));
        updateBudgetBtn.setBackground(new Color(59, 130, 246));
        updateBudgetBtn.setForeground(Color.BLACK);

        updateBudgetBtn.addActionListener(e -> {
            if (currentUser == null) return;
            try {
                double newBudget = Double.parseDouble(budgetInputField.getText().trim());
                if (newBudget < 0) {
                    JOptionPane.showMessageDialog(this, "Budget must be non-negative.", "Error", JOptionPane.ERROR_MESSAGE);
                    return;
                }
                currentUser.budget = newBudget; // Save to user account in HashMap
                budgetLimitLabel.setText(String.format("(Limit $%.2f)", currentUser.budget));
                updateDashboard();
            } catch (NumberFormatException ex) {
                JOptionPane.showMessageDialog(this, "Please enter a valid budget amount.", "Error", JOptionPane.ERROR_MESSAGE);
            }
        });

        JButton signOutBtn = new JButton("Sign Out");
        signOutBtn.setFont(new Font("SansSerif", Font.BOLD, 12));
        signOutBtn.addActionListener(e -> {
            currentUser = null; // Disconnect current user session
            cardLayout.show(mainPanel, "Auth");
        });

        budgetPanel.add(bLbl);
        budgetPanel.add(budgetInputField);
        budgetPanel.add(updateBudgetBtn);
        budgetPanel.add(Box.createHorizontalStrut(15));
        budgetPanel.add(signOutBtn);

        headerPanel.add(dashTitle, BorderLayout.WEST);
        headerPanel.add(budgetPanel, BorderLayout.EAST);

        // Stats Cards Section
        JPanel statsPanel = new JPanel(new GridLayout(1, 2, 20, 0));
        statsPanel.setOpaque(false);

        JPanel spentCard = createStatCard("TOTAL SPENT", totalSpentLabel, new Color(226, 232, 240));
        JPanel remainCard = createStatCard("REMAINING BALANCE", remainingBalanceLabel, new Color(16, 185, 129));

        statsPanel.add(spentCard);
        statsPanel.add(remainCard);

        // Expense Form Section
        JPanel formPanel = new JPanel(new FlowLayout(FlowLayout.LEFT, 15, 15));
        formPanel.setBackground(new Color(30, 41, 59));
        formPanel.setBorder(BorderFactory.createTitledBorder(
            BorderFactory.createLineBorder(new Color(51, 65, 85)), "Add New Expense", 0, 0, new Font("SansSerif", Font.BOLD, 14), Color.WHITE
        ));

        JTextField titleInput = new JTextField(16);
        JTextField amountInput = new JTextField(8);
        JComboBox<String> categorySelect = new JComboBox<>(categories);
        JButton recordBtn = new JButton("Record Expense");
        recordBtn.setFont(new Font("SansSerif", Font.BOLD, 14));

        recordBtn.addActionListener(e -> {
            if (currentUser == null) return;

            String title = titleInput.getText().trim();
            String amtStr = amountInput.getText().trim();
            String cat = (String) categorySelect.getSelectedItem();

            if (title.isEmpty() || amtStr.isEmpty()) {
                JOptionPane.showMessageDialog(this, "Please fill in title and amount.", "Error", JOptionPane.WARNING_MESSAGE);
                return;
            }

            try {
                double amt = Double.parseDouble(amtStr);
                // Save expense to active user's specific account
                currentUser.expenses.add(new Expense(title, amt, cat));

                titleInput.setText("");
                amountInput.setText("");

                updateDashboard();
            } catch (NumberFormatException ex) {
                JOptionPane.showMessageDialog(this, "Amount must be a valid number.", "Error", JOptionPane.ERROR_MESSAGE);
            }
        });

        JLabel tLbl = new JLabel("Title:"); tLbl.setFont(new Font("SansSerif", Font.PLAIN, 14)); tLbl.setForeground(Color.WHITE);
        JLabel aLbl = new JLabel("Amount ($):"); aLbl.setFont(new Font("SansSerif", Font.PLAIN, 14)); aLbl.setForeground(Color.WHITE);

        formPanel.add(tLbl);
        formPanel.add(titleInput);
        formPanel.add(aLbl);
        formPanel.add(amountInput);
        formPanel.add(categorySelect);
        formPanel.add(recordBtn);

        // Category Breakdown Section
        categoryBreakdownPanel.setLayout(new GridLayout(5, 1, 4, 4));
        categoryBreakdownPanel.setBackground(new Color(30, 41, 59));
        categoryBreakdownPanel.setBorder(BorderFactory.createTitledBorder(
            BorderFactory.createLineBorder(new Color(51, 65, 85)), "Category Breakdown (% of Monthly Income)", 0, 0, new Font("SansSerif", Font.BOLD, 14), Color.WHITE
        ));

        // Recent Transactions Table Section
        String[] columnNames = {"Title", "Category", "Amount ($)"};
        tableModel = new DefaultTableModel(columnNames, 0);
        JTable table = new JTable(tableModel);
        table.setFont(new Font("SansSerif", Font.PLAIN, 14));
        table.setRowHeight(24);
        JScrollPane scrollPane = new JScrollPane(table);
        scrollPane.setPreferredSize(new Dimension(1500, 250));

        // Assemble Dashboard
        dashboard.add(headerPanel);
        dashboard.add(Box.createVerticalStrut(20));
        dashboard.add(statsPanel);
        dashboard.add(Box.createVerticalStrut(20));
        dashboard.add(formPanel);
        dashboard.add(Box.createVerticalStrut(20));
        dashboard.add(categoryBreakdownPanel);
        dashboard.add(Box.createVerticalStrut(20));
        dashboard.add(scrollPane);

        return dashboard;
    }

    private void loadUserSession() {
        if (currentUser == null) return;
        budgetInputField.setText(String.format("%.2f", currentUser.budget));
        budgetLimitLabel.setText(String.format("(Limit $%.2f)", currentUser.budget));
        updateDashboard();
    }

    private JPanel createStatCard(String title, JLabel valueLabel, Color valueColor) {
        JPanel card = new JPanel(new GridLayout(2, 1));
        card.setBackground(new Color(30, 41, 59));
        card.setBorder(BorderFactory.createCompoundBorder(
            BorderFactory.createLineBorder(new Color(51, 65, 85), 1),
            BorderFactory.createEmptyBorder(15, 20, 15, 20)
        ));

        JLabel titleLbl = new JLabel(title);
        titleLbl.setForeground(new Color(148, 163, 184));
        titleLbl.setFont(new Font("SansSerif", Font.BOLD, 12));

        valueLabel.setFont(new Font("SansSerif", Font.BOLD, 28));
        valueLabel.setForeground(valueColor);

        card.add(titleLbl);
        card.add(valueLabel);
        return card;
    }

    // Calculates stats and category percentages relative to active user's total budget
    private void updateDashboard() {
        if (currentUser == null) return;

        double totalSpent = 0.0;
        tableModel.setRowCount(0);

        for (Expense exp : currentUser.expenses) {
            totalSpent += exp.amount;
            tableModel.addRow(new Object[]{exp.title, exp.category, String.format("-$%.2f", exp.amount)});
        }

        double remaining = currentUser.budget - totalSpent;

        totalSpentLabel.setText(String.format("$%.2f", totalSpent));
        remainingBalanceLabel.setText(String.format("$%.2f", remaining));
        remainingBalanceLabel.setForeground(remaining >= 0 ? new Color(16, 185, 129) : new Color(239, 68, 68));

        // Category Breakdown (% calculated against user's current budget)
        categoryBreakdownPanel.removeAll();
        for (String cat : categories) {
            double catTotal = currentUser.expenses.stream()
                .filter(e -> e.category.equals(cat))
                .mapToDouble(e -> e.amount)
                .sum();

            double percentage = (currentUser.budget > 0) ? (catTotal / currentUser.budget) * 100.0 : 0.0;

            JPanel row = new JPanel(new BorderLayout());
            row.setOpaque(false);
            row.setBorder(BorderFactory.createEmptyBorder(4, 15, 4, 15));

            JLabel catNameLbl = new JLabel(cat);
            catNameLbl.setFont(new Font("SansSerif", Font.PLAIN, 14));
            catNameLbl.setForeground(Color.WHITE);

            JLabel catTotalLbl = new JLabel(String.format("$%.2f (%.1f%%)", catTotal, percentage));
            catTotalLbl.setFont(new Font("SansSerif", Font.BOLD, 14));
            catTotalLbl.setForeground(new Color(56, 189, 248));

            row.add(catNameLbl, BorderLayout.WEST);
            row.add(catTotalLbl, BorderLayout.EAST);
            categoryBreakdownPanel.add(row);
        }

        categoryBreakdownPanel.revalidate();
        categoryBreakdownPanel.repaint();
    }

    // Helper UI Styling Methods
    private JTextField createStyledTextField() {
        JTextField field = new JTextField(20);
        field.setFont(new Font("SansSerif", Font.PLAIN, 14));
        field.setBackground(new Color(15, 23, 42));
        field.setForeground(Color.WHITE);
        field.setCaretColor(Color.WHITE);
        field.setBorder(BorderFactory.createCompoundBorder(
            BorderFactory.createLineBorder(new Color(71, 85, 105), 1),
            BorderFactory.createEmptyBorder(6, 10, 6, 10)
        ));
        return field;
    }

    private JPasswordField createStyledPasswordField() {
        JPasswordField field = new JPasswordField(20);
        field.setFont(new Font("SansSerif", Font.PLAIN, 14));
        field.setBackground(new Color(15, 23, 42));
        field.setForeground(Color.WHITE);
        field.setCaretColor(Color.WHITE);
        field.setBorder(BorderFactory.createCompoundBorder(
            BorderFactory.createLineBorder(new Color(71, 85, 105), 1),
            BorderFactory.createEmptyBorder(6, 10, 6, 10)
        ));
        return field;
    }

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            new TheNightOwlApp().setVisible(true);
        });
    }
}