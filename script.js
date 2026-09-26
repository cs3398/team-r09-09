
/*
    Store references to the major sections of the application.
    These elements are shown or hidden as the user moves through
    the login, sign-up, and dashboard screens.
*/
const loginSection = document.getElementById("loginSection");
const signupSection = document.getElementById("signupSection");
const dashboardSection = document.getElementById("dashboardSection");


/*
    Store references to the links and buttons used to move
    between different parts of the application.
*/
const showSignup = document.getElementById("showSignup");
const showLogin = document.getElementById("showLogin");

const logExpenseButton = document.getElementById("logExpenseButton");
const expenseSection = document.getElementById("expenseSection");

const expenseForm = document.getElementById("expenseForm");


/*
    Switches the interface from the login screen to the
    sign-up screen without reloading the page.
*/
showSignup.addEventListener("click", function(event) {
    event.preventDefault();

    loginSection.style.display = "none";
    signupSection.style.display = "block";
});


/*
    Switches the interface from the sign-up screen back
    to the login screen.
*/
showLogin.addEventListener("click", function(event) {
    event.preventDefault();

    signupSection.style.display = "none";
    loginSection.style.display = "block";
});


/*
    Handles the login form on the frontend.
    At this stage, the application only checks that both fields
    contain information. Real authentication will be handled
    by the backend and database.
*/
const loginForm = document.getElementById("loginForm");

loginForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    if (email === "" || password === "") {
        alert("Please enter your email and password.");
    } else {
        /*
            Move the user to the dashboard after the basic
            frontend validation succeeds.
        */
        loginSection.style.display = "none";
        dashboardSection.style.display = "block";
    }
});


/*
    Handles the sign-up form on the frontend.
    The form checks for missing information and makes sure
    the two password fields match.

    The backend will eventually be responsible for creating
    and securely storing the actual user account.
*/
const signupForm = document.getElementById("signupForm");

signupForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const name = document.getElementById("name").value;
    const email = document.getElementById("signupEmail").value;
    const password = document.getElementById("signupPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (name === "" || email === "" || password === "" || confirmPassword === "") {
        alert("Please fill in all fields.");
    } else if (password !== confirmPassword) {
        alert("Passwords do not match.");
    } else {
        alert("Account information entered.");
    }
});


/*
    Opens the expense form when the user chooses to log
    a new expense from the dashboard.
*/
logExpenseButton.addEventListener("click", function() {
    expenseSection.style.display = "block";
});


/*
    Handles adding an expense to the Recent Expenses section.

    Currently, expenses are only displayed on the page and are
    not permanently stored. Later, this section can be connected
    to the backend API and database.
*/
expenseForm.addEventListener("submit", function(event) {
    event.preventDefault();

    /*
        Collect the information entered by the user.
        These values represent the data that the backend will
        eventually receive and store.
    */
    const expenseName = document.getElementById("expenseName").value;
    const expenseAmount = document.getElementById("expenseAmount").value;
    const expenseCategory = document.getElementById("expenseCategory").value;
    const expenseDate = document.getElementById("expenseDate").value;

    /*
        Find the area where expenses are displayed and the
        message shown when no expenses have been added yet.
    */
    const expenseList = document.getElementById("expenseList");
    const noExpensesMessage = document.getElementById("noExpensesMessage");


    /*
        Require the main expense fields before allowing
        the expense to be added to the list.
    */
    if (
        expenseName === "" ||
        expenseAmount === "" ||
        expenseCategory === "" ||
        expenseDate === ""
    ) {
        alert("Please fill in all required expense fields.");
    } else {

        /*
            Hide the "No expenses" message because the user
            has now added their first expense.
        */
        noExpensesMessage.style.display = "none";


        /*
            Create a new HTML element to represent the expense
            in the Recent Expenses section.
        */
        const expenseItem = document.createElement("div");

        expenseItem.className = "expense-item";


        /*
            Display the expense name, category, date, and amount.
            The amount is formatted to always show two decimal places.
        */
        expenseItem.innerHTML = `
            <strong>${expenseName}</strong>
            <p>${expenseCategory} - ${expenseDate}</p>
            <p>$${parseFloat(expenseAmount).toFixed(2)}</p>
        `;


        /*
            Add the newly created expense to the expense list
            without refreshing the page.
        */
        expenseList.appendChild(expenseItem);


        /*
            Clear the form so it is ready for another expense.
        */
        expenseForm.reset();

        alert("Expense added successfully.");
    }
});