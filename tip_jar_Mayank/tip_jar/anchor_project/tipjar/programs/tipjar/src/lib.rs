use anchor_lang::prelude::*;

declare_id!("B2uUS9ypnv1Z3XGvxTF4iaLAazWye3ynVA5KA9KHP32w");

#[program]
pub mod tipjar {
    use super::*;

    pub fn initialize_jar(ctx: Context<InitializeJar>) -> Result<()> {
        let jar = &mut ctx.accounts.jar;
        jar.owner = ctx.accounts.creator.key();
        jar.total_tips = 0;
        jar.tip_count = 0;
        jar.session_id = Clock::get()?.unix_timestamp as u64;
        Ok(())
    }

    pub fn send_tip(ctx: Context<SendTip>, amount: u64) -> Result<()> {
        require!(amount > 0, TipJarError::InvalidAmount);

        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.tipper.key(),
            &ctx.accounts.jar.key(),
            amount,
        );
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.tipper.to_account_info(),
                ctx.accounts.jar.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        let jar = &mut ctx.accounts.jar;
        jar.total_tips += amount;
        jar.tip_count += 1;

        let tip = &mut ctx.accounts.tip;
        tip.tipper = ctx.accounts.tipper.key();
        tip.amount = amount;
        tip.timestamp = Clock::get()?.unix_timestamp;

        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
        require_keys_eq!(ctx.accounts.jar.owner, ctx.accounts.creator.key(), TipJarError::Unauthorized);
        
        let jar_balance = ctx.accounts.jar.to_account_info().lamports();
        let rent = Rent::get()?;
        let min_rent = rent.minimum_balance(8 + 32 + 8 + 8 + 8);
        let withdrawable = jar_balance.saturating_sub(min_rent);
        
        require!(withdrawable > 0, TipJarError::InvalidAmount);

        // Direct lamport manipulation
        **ctx.accounts.jar.to_account_info().try_borrow_mut_lamports()? -= withdrawable;
        **ctx.accounts.creator.to_account_info().try_borrow_mut_lamports()? += withdrawable;

        // ✅ Reload the account after lamport changes to refresh Anchor's view
        ctx.accounts.jar.reload()?;

        // Now safely modify the jar state
        let jar = &mut ctx.accounts.jar;
        jar.total_tips = 0;
        jar.tip_count = 0;
        jar.session_id += 1; // Increment to ensure uniqueness

        Ok(())
    }
}

#[account]
pub struct Jar {
    pub owner: Pubkey,
    pub total_tips: u64,
    pub tip_count: u64,
    pub session_id: u64,
}

#[account]
pub struct Tip {
    pub tipper: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[derive(Accounts)]
pub struct InitializeJar<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + 32 + 8 + 8 + 8,
        seeds = [b"jar", creator.key().as_ref()],
        bump
    )]
    pub jar: Account<'info, Jar>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SendTip<'info> {
    #[account(mut)]
    pub tipper: Signer<'info>,

    #[account(
        mut,
        seeds = [b"jar", jar.owner.as_ref()],
        bump
    )]
    pub jar: Account<'info, Jar>,

    #[account(
        init,
        payer = tipper,
        space = 8 + 32 + 8 + 8,
        seeds = [
            b"tip",
            jar.key().as_ref(),
            &jar.session_id.to_le_bytes(),
            &jar.tip_count.to_le_bytes()
        ],
        bump
    )]
    pub tip: Account<'info, Tip>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        mut,
        seeds = [b"jar", jar.owner.as_ref()],
        bump
    )]
    pub jar: Account<'info, Jar>,
}

#[error_code]
pub enum TipJarError {
    #[msg("Tip amount must be greater than zero")]
    InvalidAmount,
    #[msg("You are not authorized to perform this action")]
    Unauthorized,
}
