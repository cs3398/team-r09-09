import {useEffect, useState} from "react";
import {usePlaidLink} from "react-plaid-link";

const API_URL = "http://127.0.0.1:8001"

export default function Plaid({accountId, onImported}) {
    const [linkToken, setLinkToken] = useState(null);

    useEffect(() => {
        fetch(`${API_URL}/api/create_link_token`, {method: "POST"})
        .then((r) => r.json())
        .then((data) => setLinkToken(data.link_token));
    },
    []);

    const {open, ready } = usePlaidLink({
        token: linkToken,
        onSuccess: (public_token) => {
            fetch(`${API_URL}/api/exchange_public_token`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({public_token}),
            });
        },
    });

    const importTransactions = async() => {
        const r = await fetch (`${API_URL}/api/import_transactions`, {
            method: "Post",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({account_id: accountId}),
        });
        const data = await r.json();
        onImported(r.ok ? `${data.imported} expenses imported from your bank.` : data.detail);
    };

    return (
        <>
            <button type="button"
                className="dashboard-button"
                onClick={()=>open()}
                disabled={!ready}
                >
            Connect Bank
            </button>

            <button type="button"
                className="dashboard-button"
                onClick={importTransactions}
                disabled={accountId == null}
            >
            Load Transactions
            </button>
        </>

       
    
    );  
    }

