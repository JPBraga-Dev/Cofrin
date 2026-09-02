import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { formatCurrency } from '../../utils/format';

export function IconButton({label,children,onClick}:{label:string;children:ReactNode;onClick?:()=>void}){return <button className="icon-button" aria-label={label} onClick={onClick}>{children}</button>}
export function Input(props:InputHTMLAttributes<HTMLInputElement>){return <input {...props} />}
export function CurrencyInput({value,onChange,...props}:{value:number|string;onChange:(value:number)=>void}&Omit<InputHTMLAttributes<HTMLInputElement>,'value'|'onChange'>){return <input inputMode="decimal" value={value} onChange={event=>onChange(Number(event.target.value.replace(',','.')))} {...props}/>}
export function Select(props:SelectHTMLAttributes<HTMLSelectElement>){return <select {...props}/>}
export function DateInput(props:InputHTMLAttributes<HTMLInputElement>){return <input type="date" {...props}/>}
export function StatusBadge({status}:{status:string}){const tone=/overdue|exceeded|atrasado/i.test(status)?'red':/pending|warning|alerta/i.test(status)?'gold':'green';return <span className={`badge ${tone}`}>{status}</span>}
export function Modal({open,children}:{open:boolean;children:ReactNode}){return open?<div className="drawer-backdrop"><div className="modal">{children}</div></div>:null}
export function Dropdown({open,children}:{open:boolean;children:ReactNode}){return open?<div className="inline-actions">{children}</div>:null}
export function Tooltip({label,children}:{label:string;children:ReactNode}){return <span title={label}>{children}</span>}
export function Avatar({label}:{label:string}){return <span className="avatar">{label}</span>}
export function AvatarGroup({labels}:{labels:string[]}){return <div className="avatar-group">{labels.map(label=><Avatar label={label} key={label}/>)}</div>}
export function Tabs({items,active,onChange}:{items:string[];active:string;onChange:(item:string)=>void}){return <div className="tabs">{items.map(item=><button className={item===active?'active':''} onClick={()=>onChange(item)} key={item}>{item}</button>)}</div>}
export function Table({headers,children}:{headers:string[];children:ReactNode}){return <div className="table-wrap"><table className="transactions-table"><thead><tr>{headers.map(header=><th key={header}>{header}</th>)}</tr></thead><tbody>{children}</tbody></table></div>}
export function MobileCardList({children}:{children:ReactNode}){return <div className="mobile-card-list">{children}</div>}
export function Skeleton({lines=3}:{lines?:number}){return <div className="skeleton">{Array.from({length:lines},(_,index)=><i key={index}/>)}</div>}
export function Toast({message}:{message:string}){return <div className="toast" role="status">{message}</div>}
export function ConfirmDialog({open,title,detail,onConfirm,onCancel}:{open:boolean;title:string;detail:string;onConfirm:()=>void;onCancel:()=>void}){return <Modal open={open}><h2>{title}</h2><p>{detail}</p><div className="form-actions"><button className="button secondary" onClick={onCancel}>Cancelar</button><button className="button primary" onClick={onConfirm}>Confirmar</button></div></Modal>}
export function SectionHeader({title,description}:{title:string;description?:string}){return <div className="section-heading"><div><h2>{title}</h2>{description&&<p>{description}</p>}</div></div>}
export function MoneyText({amount,hidden=false}:{amount:number;hidden?:boolean}){return <strong className="money">{formatCurrency(amount,hidden)}</strong>}
