global PRICE_LADDER_BUCKETS: u32 = 256;
global MAX_BIDDERS: u32 = 10;

fn depth1_multiply(a: Field, b: Field) -> Field {
    a * b
}

fn main(
    bids: [Field; MAX_BIDDERS],
    encrypted_bids: [Field; MAX_BIDDERS],
    collaterals: [Field; MAX_BIDDERS],
    bidder_addresses: [Field; MAX_BIDDERS],
    max_price: pub Field
) -> pub (Field, Field, bool) {
    let mut aggregate = [0 as Field; PRICE_LADDER_BUCKETS];
    let mut active_bidders = [false; MAX_BIDDERS];
    
    for i in 0..MAX_BIDDERS {
        let bid = bids[i];
        let encrypted_bid = encrypted_bids[i];
        let collateral = collaterals[i];
        let address = bidder_addresses[i];
        
        let is_active = address != 0;
        active_bidders[i] = is_active;
        
        if is_active {
            // 1. Bid is correctly encrypted under committee public key (placeholder)
            assert(encrypted_bid != 0);
            
            // 2. Bid amount is within valid range [0, PRICE_LADDER_BUCKETS)
            assert((bid as u32) < PRICE_LADDER_BUCKETS);
            
            // 3. Bidder has deposited collateral (MAX_PRICE ETH)
            assert(collateral == max_price);
            
            // Each bid encodes a step function: 1 at all buckets <= chosen price, 0 above
            for j in 0..PRICE_LADDER_BUCKETS {
                if (j as u32) <= (bid as u32) {
                    // Homomorphic addition aggregates all curves
                    aggregate[j] += 1;
                }
            }
        }
    }
    
    // Pair-curve: depth1_multiply(aggregate, aggregate - 1) -> pair-indicator for buckets with >= 2 bidders
    let mut pair_curve = [0 as Field; PRICE_LADDER_BUCKETS];
    for j in 0..PRICE_LADDER_BUCKETS {
        pair_curve[j] = depth1_multiply(aggregate[j], aggregate[j] - 1);
    }
    
    // Zero-bid detection: if aggregate at lowest bucket is 0 -> zeroBids=true
    let zero_bids = aggregate[0] == 0;
    
    // Top-down progressive decryption finds highest bucket with >= 2 bidders = second price
    let mut second_price_bucket = 0;
    let mut found_second_price = false;
    for j in 0..PRICE_LADDER_BUCKETS {
        let idx = PRICE_LADDER_BUCKETS - 1 - (j as u32);
        if (pair_curve[idx] != 0) & !found_second_price {
            second_price_bucket = idx as Field;
            found_second_price = true;
        }
    }
    
    // Winner = bidder who chose the highest bucket (above second price)
    let mut winner = 0;
    let mut max_bid = 0;
    for i in 0..MAX_BIDDERS {
        if active_bidders[i] {
            if (bids[i] as u32) > (max_bid as u32) {
                max_bid = bids[i];
                winner = bidder_addresses[i];
            }
        }
    }
    
    (second_price_bucket, winner, zero_bids)
}
