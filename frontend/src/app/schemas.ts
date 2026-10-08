import { z } from 'zod';
export const transactionFormSchema=z.object({description:z.string().trim().min(1,'Descrição obrigatória'),amount:z.number().positive('Informe um valor maior que zero'),date:z.string().min(1,'Data obrigatória'),category:z.string().min(1,'Categoria obrigatória'),type:z.enum(['INCOME','EXPENSE','TRANSFER'])});
export const piggyFormSchema=z.object({name:z.string().min(1,'Nome obrigatório'),targetAmount:z.number().positive('Defina uma meta'),monthlyContribution:z.number().nonnegative(),deadline:z.string().min(1,'Prazo obrigatório')});
export const groupFormSchema=z.object({name:z.string().min(1,'Nome obrigatório'),type:z.string().min(1),targetAmount:z.number().nonnegative(),eventDate:z.string().min(1,'Data obrigatória')});
export const budgetFormSchema=z.object({category:z.string().min(1,'Categoria obrigatória'),limit:z.number().positive('Defina um limite')});
